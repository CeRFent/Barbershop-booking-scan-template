// Fix User Passwords Script
// Run this to fix passwords for existing users

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Define the User schema directly to avoid TypeScript import issues
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['customer', 'barber', 'admin'],
    default: 'customer'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create the User model
const User = mongoose.model('User', userSchema);

async function fixUserPasswords() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB!');
    
    // Get all users
    const users = await User.find({}).select('email name role createdAt password');
    
    console.log(`\n📊 Found ${users.length} users in the database:`);
    
    const defaultPassword = 'password123'; // Set a default password for all users
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 12);
    
    let fixedCount = 0;
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      
      // Check if password is properly hashed
      if (user.password.startsWith('$2b$')) {
        console.log(`   ✅ Password is already properly hashed`);
      } else {
        console.log(`   ❌ Password needs fixing - updating to default password`);
        
        // Update the user's password
        await User.findByIdAndUpdate(user._id, {
          password: hashedDefaultPassword,
          updatedAt: new Date()
        });
        
        console.log(`   ✅ Password updated to: "${defaultPassword}"`);
        fixedCount++;
      }
    }
    
    console.log(`\n🎉 Password fix completed!`);
    console.log(`   Fixed ${fixedCount} users with default password: "${defaultPassword}"`);
    console.log(`   You can now log in with any user using this password`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed.');
    process.exit(0);
  }
}

// Run the fix
fixUserPasswords();
