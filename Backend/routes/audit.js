const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/audit
// @desc    Get audit logs for admin review
// @access  Private/Admin
router.get('/', async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
