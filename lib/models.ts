import mongoose, { Schema, model, models } from 'mongoose'
import bcrypt from 'bcryptjs'

// ============================================================================
// INVENTORY SCHEMA - Management for snacks and drinks
// ============================================================================

const inventorySchema = new Schema({
  type: {
    type: String,
    enum: ['snack', 'drink'],
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// ============================================================================
// SERVICE SCHEMA - Bookable service catalog (cuts, fades, add-ons, etc.)
// ============================================================================

const serviceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  price: {
    type: Number,
    default: null,
    min: 0
  },
  priceVaries: {
    type: Boolean,
    default: false
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 5
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  depositRequired: {
    type: Boolean,
    default: false
  },
  depositAmount: {
    type: Number,
    default: null,
    min: 0
  }
}, {
  timestamps: true
})

// ============================================================================
// AVAILABILITY SCHEMA - Weekly working hours + one-off date overrides
// ============================================================================

// Singleton document — single barber, single set of hours. dayOfWeek: 0=Sun..6=Sat.
// openTime/closeTime are plain "HH:MM" (24h) strings, matching a native
// <input type="time">, and deliberately not Date objects — these represent a
// time-of-day, not a moment in time, so there's no timezone to get wrong.
const weeklyHoursEntrySchema = new Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  openTime: {
    type: String,
    default: null
  },
  closeTime: {
    type: String,
    default: null
  }
}, { _id: false })

const availabilitySchema = new Schema({
  weeklyHours: {
    type: [weeklyHoursEntrySchema],
    default: () => [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, isOpen: false, openTime: null, closeTime: null }))
  }
}, {
  timestamps: true
})

// A specific calendar date that overrides the recurring weekly hours above —
// a holiday, a short day, an extra open day. `date` is a plain "YYYY-MM-DD"
// string for the same timezone-safety reason as openTime/closeTime.
const availabilityOverrideSchema = new Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  isOpen: {
    type: Boolean,
    required: true
  },
  openTime: {
    type: String,
    default: null
  },
  closeTime: {
    type: String,
    default: null
  },
  note: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
})

// ============================================================================
// BOOKING SCHEMA - Customer appointments against the service catalog
// ============================================================================

// date/startTime/endTime are plain "YYYY-MM-DD"/"HH:MM" strings, same
// timezone-safety reasoning as Availability above — these are wall-clock
// values for a single-timezone shop, not moments in time.
const bookingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },
  // Snapshot of the service at booking time — so a later edit to the
  // catalog (price change, duration change) doesn't retroactively alter
  // what an existing booking says it is.
  serviceName: {
    type: String,
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 5
  },
  depositRequired: {
    type: Boolean,
    default: false
  },
  depositAmount: {
    type: Number,
    default: null,
    min: 0
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'confirmed',
    index: true
  },
  depositPaid: {
    type: Boolean,
    default: false
  },
  stripeCheckoutSessionId: {
    type: String,
    default: null,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  reminderSentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

bookingSchema.index({ date: 1, status: 1 })

// ============================================================================
// USER SCHEMA - Core authentication and user management
// ============================================================================

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  role: {
    type: String,
    enum: ['customer', 'barber', 'admin'],
    default: 'customer',
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  referredBy: {
    type: String,
    index: true
  },
  cuts: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  preferences: {
    favoriteDrink: {
      type: String,
      default: ''
    },
    favoriteSnack: {
      type: String,
      default: ''
    }
  },
  totalVisits: {
    type: Number,
    default: 0
  },
  lastVisit: {
    type: Date,
    default: null
  },
  stripeCustomerId: {
    type: String,
    default: null,
    index: true
  }
}, {
  timestamps: true
})

// ============================================================================
// ADMIN SCHEMA - Extended admin functionality
// ============================================================================

const adminSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin']
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  referralCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  emailVerified: {
    type: Date,
    default: null
  },
  permissions: [{
    type: String,
    enum: ['manage_users', 'manage_cuts', 'view_logs', 'manage_admins', 'manage_subscriptions', 'manage_inventory']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// ============================================================================
// SUBSCRIPTION SCHEMA - Payment and subscription management
// ============================================================================

const subscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stripeCustomerId: {
    type: String,
    default: '',
    index: true
  },
  stripeSubscriptionId: {
    type: String,
    default: '',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'past_due', 'expired'],
    default: 'inactive',
    index: true
  },
  plan: {
    type: String,
    enum: ['monthly', 'annual'],
    required: true
  },
  cutsRemaining: {
    type: Number,
    required: true,
    min: 0
  },
  cutsTotal: {
    type: Number,
    required: true,
    min: 0
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  lastRenewal: {
    type: Date,
    default: Date.now
  },
  nextRenewal: {
    type: Date
  },
  autoRenew: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// ============================================================================
// CUT SCHEMA - Individual cut tracking per month
// ============================================================================

const cutSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  monthYear: {
    type: String,
    required: true, // Format: "2024-01"
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
    type: Schema.Types.ObjectId,
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
})

// ============================================================================
// SHOP TOKEN SCHEMA - QR codes for barbers
// ============================================================================

const shopTokenSchema = new Schema({
  barberId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// ============================================================================
// SCAN LOG SCHEMA - Audit trail for cut usage
// ============================================================================

const scanLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  barberId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  cutId: {
    type: Schema.Types.ObjectId,
    ref: 'Cut',
    required: false,
    index: true
  },
  action: {
    type: String,
    enum: ['scanned', 'used', 'expired', 'created', 'manual_add', 'manual_deduct'],
    required: true,
    index: true
  },
  shopToken: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  // Snapshotted at scan time (not recomputed later) so the tablet check-in
  // feed and any historical view always show what was true at that moment
  // — same reasoning as Booking snapshotting serviceName/duration.
  isNewCustomer: {
    type: Boolean,
    default: false
  },
  hasBookingToday: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// ============================================================================
// CUT HISTORY SCHEMA - Historical cut management
// ============================================================================

const cutHistorySchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  adminId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['used', 'added', 'expired', 'reset'],
    required: true
  },
  cutsAffected: {
    type: Number,
    default: 1
  },
  previousCount: {
    type: Number,
    default: 0
  },
  newCount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  metadata: {
    shopToken: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
})

// ============================================================================
// REFERRAL SCHEMA - Tracking referrals and rewards
// ============================================================================

const referralSchema = new Schema({
  referrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referredUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  rewardAmount: {
    type: Number,
    default: 50
  },
  rewardStatus: {
    type: String,
    enum: ['pending', 'credited', 'paid', 'void'],
    default: 'pending',
    index: true
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// ============================================================================
// SETTINGS SCHEMA - Editable business config (currently just the VIP
// subscription price). A single document, upserted against a fixed `key`
// so there's exactly one row to read/write rather than a full config table.
// ============================================================================

const settingsSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'app'
  },
  // Dollars, not cents — matches how it's displayed/edited everywhere;
  // converted to cents only at the point a Stripe amount is built.
  subscriptionMonthlyPrice: {
    type: Number,
    required: true,
    default: 150,
    min: 1
  }
}, {
  timestamps: true
})

// ============================================================================
// VERIFICATION CODE SCHEMA - Email verification system
// ============================================================================

const verificationCodeSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset', 'login'],
    default: 'email_verification',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index
  },
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  metadata: {
    fullName: String,
    phone: String,
    referralCode: String,
    createdVia: {
      type: String,
      default: 'api'
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
})

// ============================================================================
// SESSION SCHEMA - JWT token management
// ============================================================================

const sessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tokenType: {
    type: String,
    enum: ['access', 'refresh'],
    default: 'access'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// ============================================================================
// AUDIT LOG SCHEMA - System-wide audit trail
// ============================================================================

const auditLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  details: {
    type: Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
})

// ============================================================================
// INDEXES FOR PERFORMANCE
// ============================================================================

// Subscription indexes
subscriptionSchema.index({ userId: 1, status: 1 })
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 })

// Cut indexes
cutSchema.index({ userId: 1, monthYear: 1 })
cutSchema.index({ userId: 1, status: 1 })
cutSchema.index({ barberId: 1, createdAt: -1 })
cutSchema.index({ status: 1, monthYear: 1 })

// Shop Token indexes
shopTokenSchema.index({ barberId: 1, isActive: 1 })
shopTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Scan Log indexes
scanLogSchema.index({ userId: 1, createdAt: -1 })
scanLogSchema.index({ barberId: 1, createdAt: -1 })
scanLogSchema.index({ action: 1, createdAt: -1 })

// Cut History indexes
cutHistorySchema.index({ userId: 1, createdAt: -1 })
cutHistorySchema.index({ adminId: 1, createdAt: -1 })
cutHistorySchema.index({ action: 1 })

// Verification Code indexes
verificationCodeSchema.index({ email: 1, code: 1 })
verificationCodeSchema.index({ email: 1, used: 1 })

// Session indexes
sessionSchema.index({ userId: 1, isActive: 1 })
// Audit Log indexes
auditLogSchema.index({ userId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ resource: 1, resourceId: 1 })

// ============================================================================
// MIDDLEWARE AND HOOKS
// ============================================================================

// Password hashing middleware for User
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Password hashing middleware for Admin
adminSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Password comparison methods
userSchema.methods.comparePassword = async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.comparePassword = async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ============================================================================
// MODEL EXPORTS
// ============================================================================

export const Inventory = models.Inventory || model('Inventory', inventorySchema)
export const Service = models.Service || model('Service', serviceSchema)
export const Availability = models.Availability || model('Availability', availabilitySchema)
export const AvailabilityOverride = models.AvailabilityOverride || model('AvailabilityOverride', availabilityOverrideSchema)
export const Booking = models.Booking || model('Booking', bookingSchema)
export const User = models.User || model('User', userSchema)
export const Admin = models.Admin || model('Admin', adminSchema)
export const Subscription = models.Subscription || model('Subscription', subscriptionSchema)
export const Cut = models.Cut || model('Cut', cutSchema)
export const ShopToken = models.ShopToken || model('ShopToken', shopTokenSchema)
export const ScanLog = models.ScanLog || model('ScanLog', scanLogSchema)
export const CutHistory = models.CutHistory || model('CutHistory', cutHistorySchema)
export const VerificationCode = models.VerificationCode || model('VerificationCode', verificationCodeSchema)    
export const Session = models.Session || model('Session', sessionSchema)
export const AuditLog = models.AuditLog || model('AuditLog', auditLogSchema)
export const Referral = models.Referral || model('Referral', referralSchema)
export const Settings = models.Settings || model('Settings', settingsSchema)



