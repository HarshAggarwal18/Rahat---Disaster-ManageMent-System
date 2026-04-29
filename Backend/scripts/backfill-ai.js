const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Incident = require('../models/Incident');
const { buildIncidentAI } = require('../utils/incidentAI');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Disaster';

const backfillIncidentAI = async (incident) => {
  const recentIncidents = await Incident.find({
    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).select('id type severity description location timestamp');

  const ai = buildIncidentAI({
    type: incident.type,
    severity: incident.severity,
    description: incident.description,
    location: incident.location
  }, recentIncidents);

  incident.ai = ai;
  await incident.save();
  return incident;
};

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const incidents = await Incident.find({
      $or: [
        { 'ai.summary': { $exists: false } },
        { 'ai.confidence': { $exists: false } },
        { ai: { $exists: false } }
      ]
    });

    if (incidents.length === 0) {
      console.log('No legacy incidents found to backfill.');
      return process.exit(0);
    }

    console.log(`Found ${incidents.length} incidents without AI metadata.`);
    for (const incident of incidents) {
      await backfillIncidentAI(incident);
      console.log(`Backfilled AI for incident ${incident.id}`);
    }

    console.log('Legacy incident AI backfill completed.');
    process.exit(0);
  } catch (error) {
    console.error('Backfill AI failed:', error);
    process.exit(1);
  }
};

run();
