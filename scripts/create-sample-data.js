const mongoose = require('mongoose')

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI

// Define schemas (simplified)
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: String,
  password: String,
  createdAt: { type: Date, default: Date.now }
})

const scanLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cut' },
  action: String,
  shopToken: String,
  createdAt: { type: Date, default: Date.now }
})

const cutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  monthYear: String,
  cutNumber: Number,
  status: String,
  createdAt: { type: Date, default: Date.now }
})

const User = mongoose.models.User || mongoose.model('User', userSchema)
const ScanLog = mongoose.models.ScanLog || mongoose.model('ScanLog', scanLogSchema)
const Cut = mongoose.models.Cut || mongoose.model('Cut', cutSchema)

async function createSampleData() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    
    console.log('Creating sample users...')
    
    // Create a sample customer user
    const customerUser = await User.findOneAndUpdate(
      { email: 'customer@example.com' },
      {
        email: 'customer@example.com',
        name: 'John Doe',
        role: 'customer',
        password: 'hashed_password_here'
      },
      { upsert: true, new: true }
    )
    
    // Get the admin user
    const adminUser = await User.findOne({ email: 'cerfent99@gmail.com' })
    if (!adminUser) {
      console.log('Admin user not found, please run login first to create admin')
      process.exit(1)
    }
    
    console.log('Creating sample cuts...')
    
    // Create sample cuts
    const cut1 = await Cut.findOneAndUpdate(
      { userId: customerUser._id, monthYear: '2024-08', cutNumber: 1 },
      {
        userId: customerUser._id,
        monthYear: '2024-08',
        cutNumber: 1,
        status: 'used'
      },
      { upsert: true, new: true }
    )
    
    const cut2 = await Cut.findOneAndUpdate(
      { userId: customerUser._id, monthYear: '2024-08', cutNumber: 2 },
      {
        userId: customerUser._id,
        monthYear: '2024-08',
        cutNumber: 2,
        status: 'available'
      },
      { upsert: true, new: true }
    )
    
    console.log('Creating sample scan logs...')
    
    // Create sample scan logs
    await ScanLog.findOneAndUpdate(
      { userId: customerUser._id, action: 'used' },
      {
        userId: customerUser._id,
        barberId: adminUser._id,
        cutId: cut1._id,
        action: 'used',
        shopToken: 'QC-TEST-TOKEN',
        createdAt: new Date()
      },
      { upsert: true, new: true }
    )
    
    await ScanLog.findOneAndUpdate(
      { userId: customerUser._id, action: 'scanned' },
      {
        userId: customerUser._id,
        barberId: adminUser._id,
        cutId: cut2._id,
        action: 'scanned',
        shopToken: 'QC-TEST-TOKEN',
        createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      },
      { upsert: true, new: true }
    )
    
    console.log('Sample data created successfully!')
    console.log('- Customer user:', customerUser.email)
    console.log('- Admin user:', adminUser.email)
    console.log('- Created 2 cuts and 2 scan logs')
    
    process.exit(0)
  } catch (error) {
    console.error('Error creating sample data:', error)
    process.exit(1)
  }
}

createSampleData()
