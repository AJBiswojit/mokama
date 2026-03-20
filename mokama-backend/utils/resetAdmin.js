/**
 * Run this script ONCE to force-reset the admin account.
 * Usage: node utils/resetAdmin.js
 *
 * It will DELETE the existing admin and create a fresh one
 * using ADMIN_EMAIL and ADMIN_PASSWORD from your .env
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin    = require('../models/Admin');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email    = process.env.ADMIN_EMAIL    || 'admin@mokama.in';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    // Delete any existing admin with this email
    const deleted = await Admin.deleteOne({ email });
    if (deleted.deletedCount > 0) {
      console.log(`🗑️  Deleted existing admin: ${email}`);
    }

    // Create fresh — bcrypt hash applied via pre-save hook in Admin model
    await Admin.create({
      name:     'MoKama Admin',
      email,
      password,
      isActive: true,
    });

    console.log('');
    console.log('✅ Admin account created successfully!');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('⚠️  Delete this script after use if password is sensitive.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
