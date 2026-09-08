const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function test() {
  console.log('Testing connection...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('SUCCESS: Connected to MongoDB');
    
    // Check if User collection is accessible
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

test();
