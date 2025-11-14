const express = require('express');
const User = require('../models/User');
const Incident = require('../models/Incident');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/volunteers
// @desc    Get all volunteers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer' })
      .select('-password')
      .populate('assignedTasks');

    res.json({
      success: true,
      count: volunteers.length,
      data: volunteers
    });
  } catch (error) {
    console.error('Get volunteers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/volunteers/available-tasks
// @desc    Get available tasks for volunteers
// @access  Private/Volunteer
router.get('/available-tasks', protect, authorize('volunteer'), async (req, res) => {
  try {
    const tasks = await Incident.find({
      status: 'available',
      verified: true
    })
      .populate('reporterId', 'firstName lastName email')
      .sort({ severity: -1, timestamp: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get available tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/volunteers/my-tasks
// @desc    Get volunteer's assigned tasks
// @access  Private/Volunteer
router.get('/my-tasks', protect, authorize('volunteer'), async (req, res) => {
  try {
    const tasks = await Incident.find({
      assignedTo: req.user._id
    })
      .populate('reporterId', 'firstName lastName email')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/volunteers/assign-task/:incidentId
// @desc    Assign task to volunteer
// @access  Private/Volunteer
router.post('/assign-task/:incidentId', protect, authorize('volunteer'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.incidentId });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    if (incident.status !== 'available' || !incident.verified) {
      return res.status(400).json({
        success: false,
        message: 'This incident is not available for assignment'
      });
    }

    // Assign to volunteer
    incident.assignedTo = req.user._id;
    incident.assignedAt = new Date();
    incident.status = 'pending';
    
    // Add volunteer to assignedVolunteers array if not already there
    if (!incident.assignedVolunteers.includes(req.user._id)) {
      incident.assignedVolunteers.push(req.user._id);
    }

    await incident.save();

    // Add to volunteer's assigned tasks if not already there
    if (!req.user.assignedTasks.includes(incident._id)) {
      req.user.assignedTasks.push(incident._id);
      await req.user.save();
    }

    const updatedIncident = await Incident.findById(incident._id)
      .populate('reporterId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    res.json({
      success: true,
      data: updatedIncident
    });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/volunteers/complete-task/:incidentId
// @desc    Mark task as completed
// @access  Private/Volunteer
router.post('/complete-task/:incidentId', protect, authorize('volunteer'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.incidentId });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    if (incident.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This task is not assigned to you'
      });
    }

    incident.status = 'completed';
    incident.resolvedAt = new Date();

    await incident.save();

    const updatedIncident = await Incident.findById(incident._id)
      .populate('reporterId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    res.json({
      success: true,
      data: updatedIncident
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/volunteers/update-location
// @desc    Update volunteer location
// @access  Private/Volunteer
router.put('/update-location', protect, authorize('volunteer'), async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    req.user.currentLocation = { lat, lng };
    await req.user.save();

    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/volunteers/unassign-task/:incidentId
// @desc    Unassign task from volunteer (go back/release)
// @access  Private/Volunteer
router.post('/unassign-task/:incidentId', protect, authorize('volunteer'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.incidentId });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    if (incident.assignedTo && incident.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This task is not assigned to you'
      });
    }

    // Unassign from volunteer
    incident.assignedTo = null;
    incident.assignedAt = null;
    incident.status = 'available';
    
    // Remove volunteer from assignedVolunteers array
    incident.assignedVolunteers = incident.assignedVolunteers.filter(
      volId => volId.toString() !== req.user._id.toString()
    );

    await incident.save();

    // Remove from volunteer's assigned tasks
    req.user.assignedTasks = req.user.assignedTasks.filter(
      taskId => taskId.toString() !== incident._id.toString()
    );
    await req.user.save();

    const updatedIncident = await Incident.findById(incident._id)
      .populate('reporterId', 'firstName lastName email');

    res.json({
      success: true,
      data: updatedIncident,
      message: 'Task unassigned successfully'
    });
  } catch (error) {
    console.error('Unassign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

