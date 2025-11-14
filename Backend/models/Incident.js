const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: [true, 'Incident type is required'],
    enum: ['fire', 'medical', 'flood', 'earthquake', 'storm', 'other']
  },
  severity: {
    type: Number,
    required: [true, 'Severity is required'],
    min: 1,
    max: 5
  },
  status: {
    type: String,
    enum: ['unverified', 'available', 'assigned', 'pending', 'in-progress', 'completed'],
    default: 'unverified'
  },
  location: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required']
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  reporter: {
    type: String,
    required: true
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  assignedVolunteers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  resources: [{
    type: String
  }],
  resolvedAt: {
    type: Date
  },
  notes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for location queries
incidentSchema.index({ location: '2dsphere' });

// Index for status and verified
incidentSchema.index({ status: 1, verified: 1 });

module.exports = mongoose.model('Incident', incidentSchema);

