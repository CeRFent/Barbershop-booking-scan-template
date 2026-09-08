const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Try the +srv connection string first, then a direct one if it fails.
const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
  try {
    console.log('Testing connection to:', MONGODB_URI.replace(/\/\/.*@/, "//***@"));
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    console.log('✅ MongoDB connection successful!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // A persistent SRV/DNS failure here usually means the cluster's
    // Network Access allowlist doesn't include this machine's IP, or the
    // URI's username/password is wrong — check both in the Atlas
    // dashboard rather than guessing at a direct shard hostname (that's
    // specific to one cluster's topology and won't work for another).
    process.exit(1);
  }
}

testConnection();
