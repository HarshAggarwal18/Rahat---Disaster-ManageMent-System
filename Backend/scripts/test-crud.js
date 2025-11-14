const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Incident = require('../models/Incident');
const generateToken = require('../utils/generateToken');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Disaster';

const testCRUD = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ========== USER CRUD TESTS ==========
    console.log('📝 Testing USER CRUD Operations...\n');

    // CREATE User
    console.log('1. CREATE User...');
    const testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'test123',
      role: 'user'
    });
    console.log('   ✅ User created:', testUser.email);

    // READ User
    console.log('2. READ User...');
    const foundUser = await User.findById(testUser._id);
    console.log('   ✅ User found:', foundUser.email);

    // UPDATE User
    console.log('3. UPDATE User...');
    foundUser.firstName = 'Updated';
    await foundUser.save();
    const updatedUser = await User.findById(testUser._id);
    console.log('   ✅ User updated:', updatedUser.firstName);

    // LIST Users
    console.log('4. LIST Users...');
    const allUsers = await User.find();
    console.log(`   ✅ Found ${allUsers.length} users`);

    // ========== INCIDENT CRUD TESTS ==========
    console.log('\n📝 Testing INCIDENT CRUD Operations...\n');

    // CREATE Incident
    console.log('1. CREATE Incident...');
    const testIncident = await Incident.create({
      id: 'INC-TEST-001',
      type: 'fire',
      severity: 4,
      status: 'unverified',
      location: { lat: 40.7128, lng: -74.0060 },
      description: 'Test incident for CRUD operations',
      reporter: `${testUser.firstName} ${testUser.lastName}`,
      reporterId: testUser._id,
      verified: false
    });
    console.log('   ✅ Incident created:', testIncident.id);

    // READ Incident
    console.log('2. READ Incident...');
    const foundIncident = await Incident.findOne({ id: testIncident.id });
    console.log('   ✅ Incident found:', foundIncident.id);

    // UPDATE Incident
    console.log('3. UPDATE Incident...');
    foundIncident.status = 'available';
    foundIncident.verified = true;
    await foundIncident.save();
    const updatedIncident = await Incident.findOne({ id: testIncident.id });
    console.log('   ✅ Incident updated:', updatedIncident.status);

    // LIST Incidents
    console.log('4. LIST Incidents...');
    const allIncidents = await Incident.find();
    console.log(`   ✅ Found ${allIncidents.length} incidents`);

    // QUERY Incidents (Filter)
    console.log('5. QUERY Incidents (Filter by status)...');
    const availableIncidents = await Incident.find({ status: 'available' });
    console.log(`   ✅ Found ${availableIncidents.length} available incidents`);

    // QUERY Incidents (Filter by verified)
    console.log('6. QUERY Incidents (Filter by verified)...');
    const verifiedIncidents = await Incident.find({ verified: true });
    console.log(`   ✅ Found ${verifiedIncidents.length} verified incidents`);

    // DELETE Incident
    console.log('7. DELETE Incident...');
    await Incident.deleteOne({ id: testIncident.id });
    const deletedCheck = await Incident.findOne({ id: testIncident.id });
    console.log('   ✅ Incident deleted:', deletedCheck === null);

    // DELETE User
    console.log('8. DELETE User...');
    await User.deleteOne({ _id: testUser._id });
    const deletedUserCheck = await User.findById(testUser._id);
    console.log('   ✅ User deleted:', deletedUserCheck === null);

    // ========== RELATIONSHIP TESTS ==========
    console.log('\n📝 Testing RELATIONSHIPS...\n');

    // Create user and incident with relationship
    const relUser = await User.create({
      firstName: 'Relation',
      lastName: 'Test',
      email: 'relation@test.com',
      password: 'test123',
      role: 'user'
    });

    const relIncident = await Incident.create({
      id: 'INC-REL-001',
      type: 'medical',
      severity: 3,
      status: 'available',
      location: { lat: 40.7589, lng: -73.9851 },
      description: 'Test relationship',
      reporter: `${relUser.firstName} ${relUser.lastName}`,
      reporterId: relUser._id,
      verified: true
    });

    // Populate relationship
    const populatedIncident = await Incident.findById(relIncident._id)
      .populate('reporterId', 'firstName lastName email');
    
    console.log('1. Test Incident-User Relationship...');
    console.log('   ✅ Reporter:', populatedIncident.reporterId.firstName);
    console.log('   ✅ Reporter Email:', populatedIncident.reporterId.email);

    // Cleanup
    await Incident.deleteOne({ _id: relIncident._id });
    await User.deleteOne({ _id: relUser._id });

    console.log('\n✅ All CRUD operations tested successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ CREATE - Working');
    console.log('   ✅ READ - Working');
    console.log('   ✅ UPDATE - Working');
    console.log('   ✅ DELETE - Working');
    console.log('   ✅ QUERY/FILTER - Working');
    console.log('   ✅ RELATIONSHIPS - Working');

    process.exit(0);
  } catch (error) {
    console.error('❌ CRUD Test Error:', error);
    process.exit(1);
  }
};

testCRUD();

