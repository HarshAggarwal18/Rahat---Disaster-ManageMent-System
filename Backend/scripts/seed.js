const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Incident = require("../models/Incident");
const Group = require("../models/Group");
const AuditLog = require("../models/AuditLog");

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/Disaster"
    );
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Incident.deleteMany({});
    await Group.deleteMany({});
    await AuditLog.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Create specified users
    const admin = await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "admin@demo.com",
      password: "demo123",
      role: "admin",
    });

    const volunteer = await User.create({
      firstName: "Volunteer",
      lastName: "User",
      email: "volunteer@demo.com",
      password: "demo123",
      role: "volunteer",
      skills: ["First Aid", "CPR", "Rescue Operations"],
      availability: true,
      currentLocation: { lat: 40.7589, lng: -73.9851 },
    });

    const user = await User.create({
      firstName: "Regular",
      lastName: "User",
      email: "user@demo.com",
      password: "demo123",
      role: "user",
    });

    const user1 = await User.create({
      firstName: "User",
      lastName: "One",
      email: "user1@demo.com",
      password: "demo123",
      role: "user",
    });

    const user2 = await User.create({
      firstName: "User",
      lastName: "Two",
      email: "user2@demo.com",
      password: "demo123",
      role: "user",
    });

    const user3 = await User.create({
      firstName: "User",
      lastName: "Three",
      email: "user3@demo.com",
      password: "demo123",
      role: "user",
    });

    const vol1 = await User.create({
      firstName: "Volunteer",
      lastName: "One",
      email: "vol1@demo.com",
      password: "demo123",
      role: "volunteer",
      skills: ["First Aid", "CPR", "Fire Response"],
      availability: true,
      currentLocation: { lat: 40.7589, lng: -73.9851 },
    });

    const vol2 = await User.create({
      firstName: "Volunteer",
      lastName: "Two",
      email: "vol2@demo.com",
      password: "demo123",
      role: "volunteer",
      skills: ["Search & Rescue", "Medical", "Heavy Equipment"],
      availability: true,
      currentLocation: { lat: 40.7505, lng: -73.9934 },
    });

    const vol3 = await User.create({
      firstName: "Volunteer",
      lastName: "Three",
      email: "vol3@demo.com",
      password: "demo123",
      role: "volunteer",
      skills: ["Communication", "Logistics", "Shelter Management"],
      availability: false,
      currentLocation: { lat: 40.7282, lng: -73.7949 },
    });

    console.log("👥 Created specified users");

    // Create volunteer groups
    const group1 = await Group.create({
      name: "Emergency Response Team Alpha",
      description: "Primary emergency response team for high-priority incidents",
      members: [vol1._id, vol2._id],
      createdBy: admin._id,
      roleScope: "volunteer"
    });

    const group2 = await Group.create({
      name: "Medical Support Unit",
      description: "Specialized medical and first aid response team",
      members: [vol1._id, vol3._id],
      createdBy: admin._id,
      roleScope: "volunteer"
    });

    console.log("👥 Created volunteer groups");

    // Create comprehensive demo incidents with ALL new fields
    const incident1 = await Incident.create({
      id: "INC-2026-001",
      type: "fire",
      severity: 5,
      status: "unverified",
      location: { lat: 40.7589, lng: -73.9851 },
      description: "Major high-rise building fire in Manhattan with multiple floors affected. Heavy smoke and structural damage reported. Immediate evacuation in progress.",
      peopleRequired: 25,
      reporter: `${user1.firstName} ${user1.lastName}`,
      reporterId: user1._id,
      verified: false,
      contactInfo: {
        phone: "+1-555-0101",
        email: "witness1@email.com",
        alternateContact: "Building Manager: +1-555-0102"
      },
      affectedPeople: {
        injured: 8,
        deceased: 2,
        evacuated: 150,
        totalAffected: 160
      },
      propertyDamage: "severe",
      urgency: "immediate",
      resourcesNeeded: ["medical-supplies", "heavy-equipment", "shelter"],
      weatherConditions: "windy",
      incidentTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      additionalDetails: {
        observations: "Fire started on 15th floor, spread rapidly due to faulty wiring. Multiple explosions heard.",
        hazards: "Structural instability, toxic smoke, falling debris, live electrical wires",
        accessibility: "Main entrance blocked by fire trucks, use side entrance on 42nd street"
      }
    });

    const incident2 = await Incident.create({
      id: "INC-2026-002",
      type: "medical",
      severity: 3,
      status: "assigned",
      location: { lat: 40.7505, lng: -73.9934 },
      description: "Mass casualty incident at Times Square subway station. Multiple people injured in stampede during rush hour.",
      peopleRequired: 15,
      reporter: `${user2.firstName} ${user2.lastName}`,
      reporterId: user2._id,
      verified: true,
      verifiedBy: admin._id,
      verifiedAt: new Date(),
      assignedTo: vol1._id,
      assignedAt: new Date(),
      assignedVolunteers: [vol1._id, vol2._id],
      assignedGroup: group1._id,
      groupAssignedAt: new Date(),
      contactInfo: {
        phone: "+1-555-0201",
        email: "emergency@transit.nyc.gov"
      },
      affectedPeople: {
        injured: 12,
        deceased: 0,
        evacuated: 200,
        totalAffected: 212
      },
      propertyDamage: "minor",
      urgency: "within-hours",
      resourcesNeeded: ["medical-supplies", "transportation", "communication"],
      weatherConditions: "rainy",
      incidentTime: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      additionalDetails: {
        observations: "Stampede caused by false alarm, multiple fractures and contusions",
        hazards: "Wet surfaces, crowded conditions, potential aftershocks",
        accessibility: "All subway entrances secured, emergency access through maintenance tunnels"
      }
    });

    const incident3 = await Incident.create({
      id: "INC-2026-003",
      type: "flood",
      severity: 4,
      status: "in-progress",
      location: { lat: 40.7282, lng: -73.7949 },
      description: "Flash flooding in Queens neighborhood following heavy rainfall. Multiple homes inundated, residents trapped.",
      peopleRequired: 30,
      reporter: `${user3.firstName} ${user3.lastName}`,
      reporterId: user3._id,
      verified: true,
      verifiedBy: admin._id,
      verifiedAt: new Date(),
      assignedTo: vol2._id,
      assignedAt: new Date(),
      assignedVolunteers: [vol2._id, vol3._id],
      assignedGroup: group2._id,
      groupAssignedAt: new Date(),
      contactInfo: {
        phone: "+1-555-0301",
        email: "flood.response@queens.gov"
      },
      affectedPeople: {
        injured: 3,
        deceased: 0,
        evacuated: 75,
        totalAffected: 78
      },
      propertyDamage: "moderate",
      urgency: "immediate",
      resourcesNeeded: ["shelter", "food-water", "clothing", "heavy-equipment", "power-generators"],
      weatherConditions: "stormy",
      incidentTime: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
      additionalDetails: {
        observations: "Water rising rapidly, basement flooding in multiple buildings",
        hazards: "Fast-moving water, downed power lines, contaminated floodwater",
        accessibility: "Streets impassable, boat access required for some areas"
      }
    });

    const incident4 = await Incident.create({
      id: "INC-2026-004",
      type: "accident",
      severity: 2,
      status: "completed",
      location: { lat: 40.7614, lng: -73.9776 },
      description: "Multi-vehicle collision on FDR Drive during morning commute. Traffic backed up for miles.",
      peopleRequired: 8,
      reporter: `${user1.firstName} ${user1.lastName}`,
      reporterId: user1._id,
      verified: true,
      verifiedBy: admin._id,
      verifiedAt: new Date(),
      assignedTo: vol3._id,
      assignedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      assignedVolunteers: [vol3._id],
      resolvedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      contactInfo: {
        phone: "+1-555-0401",
        email: "traffic@nycdot.gov"
      },
      affectedPeople: {
        injured: 5,
        deceased: 1,
        evacuated: 0,
        totalAffected: 6
      },
      propertyDamage: "moderate",
      urgency: "within-hours",
      resourcesNeeded: ["medical-supplies", "transportation", "heavy-equipment"],
      weatherConditions: "foggy",
      incidentTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      additionalDetails: {
        observations: "Chain reaction collision involving 8 vehicles, hazardous materials spill",
        hazards: "Fuel leaks, broken glass, live electrical wires from downed traffic lights",
        accessibility: "FDR Drive closed in both directions, detour routes established"
      }
    });

    const incident5 = await Incident.create({
      id: "INC-2026-005",
      type: "storm",
      severity: 3,
      status: "available",
      location: { lat: 40.7831, lng: -73.9712 },
      description: "Severe windstorm damage in Central Park. Fallen trees blocking paths, power outages reported.",
      peopleRequired: 12,
      reporter: `${user2.firstName} ${user2.lastName}`,
      reporterId: user2._id,
      verified: true,
      verifiedBy: admin._id,
      verifiedAt: new Date(),
      contactInfo: {
        phone: "+1-555-0501",
        email: "parks@nyc.gov"
      },
      affectedPeople: {
        injured: 1,
        deceased: 0,
        evacuated: 25,
        totalAffected: 26
      },
      propertyDamage: "minor",
      urgency: "within-day",
      resourcesNeeded: ["heavy-equipment", "power-generators", "communication"],
      weatherConditions: "windy",
      incidentTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      additionalDetails: {
        observations: "Multiple large trees uprooted, blocking main park entrances",
        hazards: "Fallen power lines, unstable trees, debris in high winds",
        accessibility: "Park closed to public, emergency access through service roads"
      }
    });

    const incident6 = await Incident.create({
      id: "INC-2026-006",
      type: "earthquake",
      severity: 4,
      status: "pending",
      location: { lat: 40.7505, lng: -73.9934 },
      description: "Magnitude 5.2 earthquake centered in Manhattan. Buildings damaged, aftershocks expected.",
      peopleRequired: 50,
      reporter: `${user3.firstName} ${user3.lastName}`,
      reporterId: user3._id,
      verified: false,
      contactInfo: {
        phone: "+1-555-0601",
        email: "emergency@nyc.gov"
      },
      affectedPeople: {
        injured: 15,
        deceased: 3,
        evacuated: 500,
        totalAffected: 518
      },
      propertyDamage: "severe",
      urgency: "immediate",
      resourcesNeeded: ["medical-supplies", "shelter", "food-water", "heavy-equipment", "communication", "power-generators"],
      weatherConditions: "clear",
      incidentTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      additionalDetails: {
        observations: "Magnitude 5.2 quake, epicenter at 40.75N 73.99W, depth 5km",
        hazards: "Building collapse risk, gas leaks, damaged infrastructure, aftershocks",
        accessibility: "Multiple streets blocked by debris, helicopter access may be needed"
      }
    });

    console.log("🚨 Created comprehensive demo incidents with all new fields");

    // Create sample audit logs
    await AuditLog.create([
      {
        userId: admin._id,
        userName: "Admin User",
        role: "admin",
        action: "incident_verified",
        entityType: "incident",
        entityId: "INC-2026-002",
        details: { severity: 3, type: "medical" },
        timestamp: new Date(Date.now() - 60 * 60 * 1000)
      },
      {
        userId: admin._id,
        userName: "Admin User",
        role: "admin",
        action: "volunteer_assigned",
        entityType: "incident",
        entityId: "INC-2026-002",
        details: { volunteerId: vol1._id, groupId: group1._id },
        timestamp: new Date(Date.now() - 50 * 60 * 1000)
      },
      {
        userId: user1._id,
        userName: "User One",
        role: "user",
        action: "incident_created",
        entityType: "incident",
        entityId: "INC-2026-001",
        details: { type: "fire", severity: 5 },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ]);

    console.log("📋 Created sample audit logs");

    console.log("\n✅ Seeding completed successfully!");
    console.log("\n📊 Demo Data Summary:");
    console.log("👤 Users Created (all passwords: demo123):");
    console.log("   Admin: admin@demo.com");
    console.log("   Volunteer: volunteer@demo.com");
    console.log("   User: user@demo.com");
    console.log("   Users: user1@demo.com, user2@demo.com, user3@demo.com");
    console.log("   Volunteers: vol1@demo.com, vol2@demo.com, vol3@demo.com");
    console.log("👥 Groups: 2 volunteer groups created");
    console.log("🚨 Incidents: 6 comprehensive incidents with all new fields");
    console.log("📋 Audit Logs: Sample admin activity logs");

    console.log("\n🎯 Features Demonstrated:");
    console.log("   ✅ Contact Information");
    console.log("   ✅ Impact Assessment (injured/deceased/evacuated)");
    console.log("   ✅ Property Damage Levels");
    console.log("   ✅ Urgency Levels");
    console.log("   ✅ Resource Requirements");
    console.log("   ✅ Weather Conditions");
    console.log("   ✅ Incident Timing");
    console.log("   ✅ Additional Details & Hazards");
    console.log("   ✅ Volunteer Groups & Assignments");
    console.log("   ✅ Audit Logging");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

seedData();
