import bcrypt from 'bcryptjs'
import { User } from '@/lib/models'
import connectDB from '@/lib/mongodb'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function authenticateUser(email: string, password: string) {
  await connectDB()

  console.log('[authenticateUser] Attempting to authenticate email:', email)
  const user = await User.findOne({ email: email.toLowerCase() })

  if (!user) {
    console.warn('[authenticateUser] No user found with email:', email)
    throw new Error('Invalid credentials')
  }

  const isValid = await comparePassword(password, user.password)

  if (!isValid) {
    console.warn('[authenticateUser] Password mismatch for email:', email)
    throw new Error('Invalid credentials')
  }

  // Update last login timestamp
  await User.findByIdAndUpdate(user._id, {
    lastLoginAt: new Date(),
    updatedAt: new Date()
  })

  // Return updated user
  const updatedUser = await User.findById(user._id)
  return updatedUser
}

// Bootstraps (or updates the password of) the admin account. Intended to be run
// only via `scripts/init-admin.js` from a trusted shell — never call this from a
// public route, since it upserts credentials for whatever ADMIN_EMAIL is set to.
export async function createAdminUser() {
  await connectDB()

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set to bootstrap an admin account')
  }

  try {
    const hashedPassword = await hashPassword(adminPassword)
    
    // Use upsert to create or update the admin user
    const adminUser = await User.findOneAndUpdate(
      { email: adminEmail.toLowerCase() },
      { 
        $set: {
          email: adminEmail.toLowerCase(),
          password: hashedPassword,
          name: 'Admin',
          role: 'admin',
          emailVerified: true,
          isActive: true
        }
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    )

    console.log('Admin user verified/updated successfully:', adminUser.email)
    return adminUser
  } catch (error) {
    console.error('Error ensuring admin user exists:', error)
    throw error
  }
}
