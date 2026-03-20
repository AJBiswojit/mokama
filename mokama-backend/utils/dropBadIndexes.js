/**
 * Run this ONCE manually if you see E11000 employerId duplicate key errors:
 *   node utils/dropBadIndexes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mokama');
  console.log('Connected');

  const db = mongoose.connection.db;

  try {
    await db.collection('employers').dropIndex('employerId_1');
    console.log('✅ Dropped stale index: employers.employerId_1');
  } catch (e) {
    console.log('ℹ️  Index employers.employerId_1 not found (already clean)');
  }

  try {
    await db.collection('workers').dropIndex('workerId_1');
    console.log('✅ Dropped stale index: workers.workerId_1');
  } catch (e) {
    console.log('ℹ️  Index workers.workerId_1 not found (already clean)');
  }

  await mongoose.disconnect();
  console.log('Done. Restart your backend server now.');
}

fix().catch(console.error);
