const express = require('express');
const { body, validationResult } = require('express-validator');
const Incident = require('../models/Incident');
const { protect } = require('../middleware/auth');
const { generateIncidentId } = require('../utils/generateId');

const router = express.Router();

// @route   GET /api/incidents
// @desc    Get all incidents
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, verified, type, severity } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (verified !== undefined) query.verified = verified === 'true';
    if (type) query.type = type;
    if (severity) query.severity = parseInt(severity);

    const incidents = await Incident.find(query)
      .populate('reporterId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('assignedVolunteers', 'firstName lastName email')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/incidents/:id
// @desc    Get single incident
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id })
      .populate('reporterId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('assignedVolunteers', 'firstName lastName email');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      data: incident
    });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/incidents
// @desc    Create new incident
// @access  Private
router.post('/', protect, [
  body('type').isIn(['fire', 'medical', 'flood', 'earthquake', 'storm', 'other']).withMessage('Invalid incident type'),
  body('severity').isInt({ min: 1, max: 5 }).withMessage('Severity must be between 1 and 5'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('location.lat').isFloat().withMessage('Valid latitude is required'),
  body('location.lng').isFloat().withMessage('Valid longitude is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: errors.array().map(e => e.msg).join(', '),
        errors: errors.array()
      });
    }

    const { type, severity, description, location } = req.body;

    // Generate unique incident ID
    let incidentId;
    let isUnique = false;
    while (!isUnique) {
      incidentId = generateIncidentId();
      const existing = await Incident.findOne({ id: incidentId });
      if (!existing) isUnique = true;
    }

    // Get reporter info
    const reporter = `${req.user.firstName} ${req.user.lastName}`;

    const incident = await Incident.create({
      id: incidentId,
      type,
      severity,
      description,
      location,
      reporter,
      reporterId: req.user._id,
      status: 'unverified',
      verified: false
    });

    const populatedIncident = await Incident.findById(incident._id)
      .populate('reporterId', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: populatedIncident
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/incidents/:id
// @desc    Update incident
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Check authorization
    const isAdmin = req.user.role === 'admin';
    const isReporter = incident.reporterId.toString() === req.user._id.toString();
    const isAssigned = incident.assignedTo && incident.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isReporter && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this incident'
      });
    }

    // Update fields
    const { status, description, severity, assignedTo, verified } = req.body;

    if (status) incident.status = status;
    if (description) incident.description = description;
    if (severity) incident.severity = severity;
    if (assignedTo) {
      incident.assignedTo = assignedTo;
      incident.assignedAt = new Date();
    }
    if (verified !== undefined && isAdmin) {
      incident.verified = verified;
      if (verified) {
        incident.verifiedBy = req.user._id;
        incident.verifiedAt = new Date();
        if (incident.status === 'unverified') {
          incident.status = 'available';
        }
      }
    }
    if (status === 'completed') {
      incident.resolvedAt = new Date();
    }

    await incident.save();

    const updatedIncident = await Incident.findById(incident._id)
      .populate('reporterId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email');

    res.json({
      success: true,
      data: updatedIncident
    });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/incidents/:id
// @desc    Delete incident
// @access  Private/Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Only admin or reporter can delete
    const isAdmin = req.user.role === 'admin';
    const isReporter = incident.reporterId.toString() === req.user._id.toString();

    if (!isAdmin && !isReporter) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this incident'
      });
    }

    await incident.deleteOne();

    res.json({
      success: true,
      message: 'Incident deleted successfully'
    });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

