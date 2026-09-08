// Cleanup Duplicate Cuts Script
// Run this to remove duplicate cuts for a specific user

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define the Cut schema directly to avoid TypeScript import issues
const cutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  monthYear: {
    type: String,
    required: true,
    index: true
  },
  cutNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  status: {
    type: String,
    enum: ['available', 'used', 'expired'],
    default: 'available',
    index: true
  },
  usedAt: {
    type: Date,
    default: null
  },
  barberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  shopTokenUsed: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create the Cut model
const Cut = mongoose.model('Cut', cutSchema);

async function cleanupDuplicateCuts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB!');
    
    // Find all users with cuts
    const usersWithCuts = await Cut.distinct('userId');
    
    for (const userId of usersWithCuts) {
      console.log(`\n🧹 Cleaning up cuts for user: ${userId}`);
      
      // Get all cuts for this user
      const allCuts = await Cut.find({ userId }).sort({ monthYear: 1, cutNumber: 1 });
      
      // Group cuts by monthYear and cutNumber
      const cutGroups = {};
      allCuts.forEach(cut => {
        const key = `${cut.monthYear}-${cut.cutNumber}`;
        if (!cutGroups[key]) {
          cutGroups[key] = [];
        }
        cutGroups[key].push(cut);
      });
      
      // Find duplicates and keep only the first one
      let duplicatesRemoved = 0;
      for (const [key, cuts] of Object.entries(cutGroups)) {
        if (cuts.length > 1) {
          console.log(`  Found ${cuts.length} duplicates for ${key}, keeping first one`);
          
          // Keep the first cut, delete the rest
          const cutsToDelete = cuts.slice(1);
          const cutIdsToDelete = cutsToDelete.map(cut => cut._id);
          
          await Cut.deleteMany({ _id: { $in: cutIdsToDelete } });
          duplicatesRemoved += cutsToDelete.length;
        }
      }
      
      if (duplicatesRemoved > 0) {
        console.log(`  ✅ Removed ${duplicatesRemoved} duplicate cuts for user ${userId}`);
      } else {
        console.log(`  ✅ No duplicates found for user ${userId}`);
      }
    }
    
    console.log('\n🎉 Cleanup completed!');
    
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

// Run the cleanup
cleanupDuplicateCuts();
