const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Run as: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' node scripts/init-admin.js
// Safe to re-run — it upserts the admin account and resets its password to
// ADMIN_PASSWORD, so only run it deliberately, not as part of app startup.
//
// Self-contained on purpose (plain mongoose, no import of the TS app code)
// so it can run under plain `node` with no extra build step — matching
// scripts/create-sample-data.js in this same folder.

const MONGODB_URI = process.env.MONGODB_URI
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['customer', 'barber', 'admin'], default: 'customer' },
  emailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

async function initAdmin() {
  if (!MONGODB_URI) {
    console.error('Set MONGODB_URI before running this script.')
    process.exit(1)
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.')
    process.exit(1)
  }

  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)

    console.log('Creating/updating admin user...')
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)

    const admin = await User.findOneAndUpdate(
      { email: ADMIN_EMAIL.toLowerCase() },
      {
        $set: {
          email: ADMIN_EMAIL.toLowerCase(),
          password: hashedPassword,
          name: 'Admin',
          role: 'admin',
          emailVerified: true,
          isActive: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    console.log('Admin user ready:', admin.email)
    process.exit(0)
  } catch (error) {
    console.error('Error initializing admin user:', error)
    process.exit(1)
  }
}

initAdmin()
