const express = require('express');
const { body, validationResult } = require('express-validator');
const Group = require('../models/Group');
const User = require('../models/User');
const Incident = require('../models/Incident');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/groups
// @desc    Get groups (admin sees all, volunteers see theirs)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? {}
      : { $or: [{ createdBy: req.user._id }, { members: req.user._id }] };

    const groups = await Group.find(query)
      .populate('members', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/groups
// @desc    Create group
// @access  Private (admin/volunteer)
router.post('/', protect, authorize('admin', 'volunteer'), [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('members').optional().isArray().withMessage('Members must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(e => e.msg).join(', ')
      });
    }

    const { name, members = [], notes } = req.body;
    const memberDocs = await User.find({ _id: { $in: members }, role: 'volunteer' });
    const memberIds = memberDocs.map(m => m._id);

    const group = await Group.create({
      name,
      createdBy: req.user._id,
      roleScope: req.user.role,
      members: memberIds,
      notes
    });

    const populated = await Group.findById(group._id)
      .populate('members', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName email role');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/groups/:groupId/members
// @desc    Update group members
// @access  Private (admin/volunteer owning group)
router.put('/:groupId/members', protect, authorize('admin', 'volunteer'), async (req, res) => {
  try {
    const { members = [] } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isOwner = group.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this group'
      });
    }

    const memberDocs = await User.find({ _id: { $in: members }, role: 'volunteer' });
    group.members = memberDocs.map(m => m._id);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate('members', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName email role');

    res.json({
      success: true,
      data: populated
    });
  } catch (error) {
    console.error('Update group members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/groups/:groupId/assign/:incidentId
// @desc    Assign group to incident
// @access  Private (admin/volunteer)
router.post('/:groupId/assign/:incidentId', protect, authorize('admin', 'volunteer'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members', '_id');
    const incident = await Incident.findOne({ id: req.params.incidentId });

    if (!group || !incident) {
      return res.status(404).json({
        success: false,
        message: 'Group or incident not found'
      });
    }

    const canAssign = req.user.role === 'admin' || group.createdBy.toString() === req.user._id.toString();
    if (!canAssign) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign this group'
      });
    }

    incident.assignedGroup = group._id;
    incident.groupAssignedAt = new Date();
    incident.status = incident.status === 'unverified' ? 'unverified' : 'pending';

    const memberIds = group.members.map(m => m._id.toString());
    incident.assignedVolunteers = Array.from(new Set([...(incident.assignedVolunteers || []).map(id => id.toString()), ...memberIds]))
      .map(id => id);

    await incident.save();

    const updated = await Incident.findById(incident._id)
      .populate('assignedGroup', 'name')
      .populate('assignedVolunteers', 'firstName lastName email');

    const io = req.app.get('io');
    if (io) {
      io.emit('incident:updated', updated);
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Assign group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
