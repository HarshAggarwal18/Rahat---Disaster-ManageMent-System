const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Incident = require("../models/Incident");

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
    console.log("🗑️  Cleared existing data");

    // Create demo users
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
      skills: ["First Aid", "Fire Response"],
      availability: true,
      currentLocation: { lat: 40.75, lng: -73.99 },
    });

    const user = await User.create({
      firstName: "Regular",
      lastName: "User",
      email: "user@demo.com",
      password: "demo123",
      role: "user",
    });

    console.log("👥 Created demo users");

    // Create demo incidents
    const incident1 = await Incident.create({
      id: "INC-2025-001",
      type: "fire",
      severity: 5,
      status: "unverified",
      location: { lat: 40.7589, lng: -73.9851 },
      description: "High-rise building fire in Manhattan",
      reporter: `${user.firstName} ${user.lastName}`,
      reporterId: user._id,
      verified: false,
    });

    const incident2 = await Incident.create({
      id: "INC-2025-002",
      type: "medical",
      severity: 3,
      status: "available",
      location: { lat: 40.7505, lng: -73.9934 },
      description: "Cardiac emergency at subway station",
      reporter: `${user.firstName} ${user.lastName}`,
      reporterId: user._id,
      verified: true,
      verifiedBy: admin._id,
      verifiedAt: new Date(),
    });

    console.log("🚨 Created demo incidents");
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
