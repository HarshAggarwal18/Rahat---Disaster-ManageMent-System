const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Incident = require("../models/Incident");

dotenv.config();

// Indian cities coordinates
const indianLocations = [
  { city: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { city: "Delhi", lat: 28.6139, lng: 77.2090 },
  { city: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  { city: "Chennai", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { city: "Pune", lat: 18.5204, lng: 73.8567 },
  { city: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { city: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { city: "Surat", lat: 21.1702, lng: 72.8311 },
  { city: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { city: "Kanpur", lat: 26.4499, lng: 80.3319 },
  { city: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { city: "Indore", lat: 22.7196, lng: 75.8577 },
  { city: "Thane", lat: 19.2183, lng: 72.9781 },
  { city: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { city: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  { city: "Patna", lat: 25.5941, lng: 85.1376 },
  { city: "Vadodara", lat: 22.3072, lng: 73.1812 },
  { city: "Ghaziabad", lat: 28.6692, lng: 77.4538 }
];

const incidentTypes = ['fire', 'medical', 'flood', 'earthquake', 'storm', 'other'];
const incidentDescriptions = {
  fire: ['Building fire', 'Vehicle fire', 'Forest fire', 'Industrial fire', 'Residential fire'],
  medical: ['Cardiac emergency', 'Accident victim', 'Medical emergency', 'Ambulance needed', 'Critical patient'],
  flood: ['Flash flood', 'River overflow', 'Urban flooding', 'Waterlogging', 'Damaged infrastructure'],
  earthquake: ['Earthquake tremor', 'Building collapse', 'Structural damage', 'Aftershock', 'Emergency response needed'],
  storm: ['Cyclone warning', 'Heavy rainfall', 'Wind damage', 'Power outage', 'Tree fall'],
  other: ['Emergency situation', 'Disaster response', 'Urgent help needed', 'Critical incident', 'Public safety issue']
};

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/Disaster"
    );
    console.log("✅ Connected to MongoDB");

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // await Incident.deleteMany({});
    // console.log("🗑️  Cleared existing data");

    // Create demo users if they don't exist
    let admin = await User.findOne({ email: "admin@demo.com" });
    if (!admin) {
      admin = await User.create({
        firstName: "Admin",
        lastName: "User",
        email: "admin@demo.com",
        password: "demo123",
        role: "admin",
      });
      console.log("👤 Created admin user");
    }

    let volunteer = await User.findOne({ email: "volunteer@demo.com" });
    if (!volunteer) {
      volunteer = await User.create({
        firstName: "Volunteer",
        lastName: "User",
        email: "volunteer@demo.com",
        password: "demo123",
        role: "volunteer",
        skills: ["First Aid", "Fire Response", "Rescue Operations"],
        availability: true,
        currentLocation: { lat: 19.0760, lng: 72.8777 }, // Mumbai
      });
      console.log("👤 Created volunteer user");
    }

    let user = await User.findOne({ email: "user@demo.com" });
    if (!user) {
      user = await User.create({
        firstName: "Regular",
        lastName: "User",
        email: "user@demo.com",
        password: "demo123",
        role: "user",
      });
      console.log("👤 Created regular user");
    }

    // Create multiple incidents across Indian cities
    const incidents = [];
    let incidentCounter = 1;

    // Create 30+ incidents across different Indian cities
    for (let i = 0; i < 35; i++) {
      const location = indianLocations[Math.floor(Math.random() * indianLocations.length)];
      const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
      const descriptions = incidentDescriptions[type];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      const severity = Math.floor(Math.random() * 5) + 1; // 1-5
      
      // Add some random offset to location for variety
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lngOffset = (Math.random() - 0.5) * 0.1;
      
      const incidentId = `INC-2025-${String(incidentCounter).padStart(3, '0')}`;
      incidentCounter++;

      // 70% verified, 30% unverified
      const isVerified = Math.random() > 0.3;
      // If verified, make it available (60%), pending (20%), or completed (20%)
      let status = 'unverified';
      if (isVerified) {
        const rand = Math.random();
        if (rand < 0.6) status = 'available';
        else if (rand < 0.8) status = 'pending';
        else status = 'completed';
      }

      const incident = await Incident.create({
        id: incidentId,
        type: type,
        severity: severity,
        status: status,
        location: { 
          lat: location.lat + latOffset, 
          lng: location.lng + lngOffset 
        },
        description: `${description} in ${location.city}`,
        reporter: `${user.firstName} ${user.lastName}`,
        reporterId: user._id,
        verified: isVerified,
        verifiedBy: isVerified ? admin._id : null,
        verifiedAt: isVerified ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
        resolvedAt: status === 'completed' ? new Date() : null
      });

      incidents.push(incident);
    }

    console.log(`🚨 Created ${incidents.length} incidents across Indian cities`);
    console.log(`   - Verified: ${incidents.filter(i => i.verified).length}`);
    console.log(`   - Available: ${incidents.filter(i => i.status === 'available').length}`);
    console.log(`   - Pending: ${incidents.filter(i => i.status === 'pending').length}`);
    console.log(`   - Completed: ${incidents.filter(i => i.status === 'completed').length}`);
    
    console.log("\n✅ Seeding completed successfully!");
    console.log("\nDemo credentials:");
    console.log("Admin: admin@demo.com / demo123");
    console.log("Volunteer: volunteer@demo.com / demo123");
    console.log("User: user@demo.com / demo123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

seedData();

