const express = require('express');
const User = require('../models/User');
const Incident = require('../models/Incident');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    const totalIncidents = await Incident.countDocuments();
    const verifiedIncidents = await Incident.countDocuments({ verified: true });
    const unverifiedIncidents = await Incident.countDocuments({ verified: false });
    const activeVolunteers = await User.countDocuments({ role: 'volunteer', status: 'active' });
    const totalUsers = await User.countDocuments();
    const completedIncidents = await Incident.countDocuments({ status: 'completed' });
    
    // Get incidents by status
    const incidentsByStatus = await Incident.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get incidents by type
    const incidentsByType = await Incident.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get incidents by severity
    const incidentsBySeverity = await Incident.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalIncidents,
        verifiedIncidents,
        unverifiedIncidents,
        activeVolunteers,
        totalUsers,
        completedIncidents,
        incidentsByStatus,
        incidentsByType,
        incidentsBySeverity
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/verify-incident/:incidentId
// @desc    Verify an incident
// @access  Private/Admin
router.post('/verify-incident/:incidentId', async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.incidentId });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    incident.verified = true;
    incident.verifiedBy = req.user._id;
    incident.verifiedAt = new Date();
    if (incident.status === 'unverified') {
      incident.status = 'available';
    }

    await incident.save();

    const updatedIncident = await Incident.findById(incident._id)
      .populate('reporterId', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email');

    res.json({
      success: true,
      data: updatedIncident
    });
  } catch (error) {
    console.error('Verify incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/reject-incident/:incidentId
// @desc    Reject an incident
// @access  Private/Admin
router.post('/reject-incident/:incidentId', async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.incidentId });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    await incident.deleteOne();

    res.json({
      success: true,
      message: 'Incident rejected and deleted'
    });
  } catch (error) {
    console.error('Reject incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/users/:userId/role
// @desc    Update user role
// @access  Private/Admin
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'volunteer', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/users/:userId/status
// @desc    Update user status
// @access  Private/Admin
router.put('/users/:userId/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/assign-incident/:incidentId
// @desc    Assign incident to volunteer (Admin only)
// @access  Private/Admin
router.post('/assign-incident/:incidentId', async (req, res) => {
  try {
    const { volunteerId } = req.body;
    const incident = await Incident.findOne({ id: req.params.incidentId });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    if (!volunteerId) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer ID is required'
      });
    }

    const volunteer = await User.findById(volunteerId);

    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    // Assign to volunteer
    incident.assignedTo = volunteer._id;
    incident.assignedAt = new Date();
    incident.status = 'pending';
    
    // Add volunteer to assignedVolunteers array if not already there
    if (!incident.assignedVolunteers.includes(volunteer._id)) {
      incident.assignedVolunteers.push(volunteer._id);
    }

    await incident.save();

    // Add to volunteer's assigned tasks if not already there
    if (!volunteer.assignedTasks.includes(incident._id)) {
      volunteer.assignedTasks.push(incident._id);
      await volunteer.save();
    }

    const updatedIncident = await Incident.findById(incident._id)
      .populate('reporterId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email');

    res.json({
      success: true,
      data: updatedIncident
    });
  } catch (error) {
    console.error('Assign incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/volunteers/:volunteerId/location
// @desc    Update volunteer location (Admin only)
// @access  Private/Admin
router.put('/volunteers/:volunteerId/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const volunteer = await User.findById(req.params.volunteerId);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    if (volunteer.role !== 'volunteer') {
      return res.status(400).json({
        success: false,
        message: 'User is not a volunteer'
      });
    }

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required'
      });
    }

    volunteer.currentLocation = {
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    };

    await volunteer.save();

    res.json({
      success: true,
      data: volunteer
    });
  } catch (error) {
    console.error('Update volunteer location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

