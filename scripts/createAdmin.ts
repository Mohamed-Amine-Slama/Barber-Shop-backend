import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

// Load environment variables
dotenv.config();

const ADMIN_EMAIL = 'oussamaBarber17@admin.com';
const ADMIN_PASSWORD = 'oussamabarber205080';

async function createAdminAccount() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barber-shop';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log('Admin account already exists');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      firstName: 'Admin',
      lastName: 'User',
      phone: '1234567890',
      role: 'admin',
      isActive: true
    });

    await admin.save();
    console.log('Admin account created successfully!');
    console.log('You can now log in with:');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin account:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdminAccount();