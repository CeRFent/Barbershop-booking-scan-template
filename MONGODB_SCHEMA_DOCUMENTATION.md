# MongoDB Database Schema Documentation

## Overview

This document describes the complete MongoDB database schema for this barbershop booking template. The schema supports user authentication, subscription management, cut tracking, and comprehensive audit logging.

## Database Collections

### 1. Users Collection (`users`)

**Purpose**: Core user authentication and profile management

**Key Fields**:
- `email` (String, Required, Unique, Indexed): User's email address
- `password` (String, Required): Hashed password using bcrypt
- `name` (String, Required): User's full name
- `phone` (String, Optional): User's phone number
- `role` (String, Enum): User role - 'customer', 'barber', 'admin'
- `emailVerified` (Boolean): Email verification status
- `emailVerifiedAt` (Date): When email was verified
- `referralCode` (String, Unique): User's referral code
- `referredBy` (String): Who referred this user
- `cuts` (Number): Current number of available cuts
- `isActive` (Boolean): Account status
- `lastLoginAt` (Date): Last login timestamp

**Indexes**:
- `email`: For fast login lookups
- `role`: For role-based queries
- `referralCode`: For referral system
- `referredBy`: For referral tracking
- `isActive`: For active user filtering

**Relationships**:
- Referenced by: `subscriptions.userId`, `cuts.userId`, `scanLogs.userId`, `sessions.userId`

### 2. Admins Collection (`admins`)

**Purpose**: Extended admin functionality with permissions

**Key Fields**:
- `email` (String, Required, Unique): Admin email
- `password` (String, Required): Hashed password
- `name` (String, Required): Admin name
- `role` (String): Always 'admin'
- `permissions` (Array): Array of permission strings
- `isActive` (Boolean): Admin account status
- `lastLoginAt` (Date): Last login timestamp

**Permissions**:
- `manage_users`: Can manage user accounts
- `manage_cuts`: Can manage cut allocations
- `view_logs`: Can view system logs
- `manage_admins`: Can manage other admins
- `manage_subscriptions`: Can manage subscriptions

**Indexes**:
- `email`: For admin login
- `permissions`: For permission-based queries
- `isActive`: For active admin filtering

### 3. Subscriptions Collection (`subscriptions`)

**Purpose**: Payment and subscription management

**Key Fields**:
- `userId` (ObjectId, Required): Reference to User
- `stripeCustomerId` (String): Stripe customer ID
- `stripeSubscriptionId` (String): Stripe subscription ID
- `status` (String, Enum): 'active', 'inactive', 'cancelled', 'past_due', 'expired'
- `plan` (String, Enum): 'monthly' or 'annual'
- `cutsRemaining` (Number): Available cuts in current period
- `cutsTotal` (Number): Total cuts allocated for period
- `currentPeriodStart` (Date): Period start date
- `currentPeriodEnd` (Date): Period end date
- `lastRenewal` (Date): Last renewal date
- `nextRenewal` (Date): Next renewal date
- `autoRenew` (Boolean): Auto-renewal setting

**Indexes**:
- `userId, status`: For user's active subscriptions
- `status, currentPeriodEnd`: For expiring subscriptions
- `stripeCustomerId`: For Stripe integration
- `stripeSubscriptionId`: For Stripe webhooks

**Relationships**:
- References: `users._id`

### 4. Cuts Collection (`cuts`)

**Purpose**: Individual cut tracking per month

**Key Fields**:
- `userId` (ObjectId, Required): Reference to User
- `monthYear` (String, Required): Format "YYYY-MM"
- `cutNumber` (Number, Required): Cut number (1-10)
- `status` (String, Enum): 'available', 'used', 'expired'
- `usedAt` (Date): When cut was used
- `barberId` (ObjectId): Reference to barber who used the cut
- `shopTokenUsed` (String): Shop token used for this cut
- `notes` (String): Additional notes

**Indexes**:
- `userId, monthYear`: For user's monthly cuts
- `userId, status`: For available cuts
- `barberId, createdAt`: For barber's cut history
- `status, monthYear`: For expiring cuts

**Relationships**:
- References: `users._id` (both userId and barberId)

### 5. Shop Tokens Collection (`shoptokens`)

**Purpose**: QR codes for barber authentication

**Key Fields**:
- `barberId` (ObjectId, Required): Reference to barber
- `token` (String, Required, Unique): Unique token string
- `isActive` (Boolean): Token status
- `expiresAt` (Date): Token expiration
- `lastUsedAt` (Date): Last usage timestamp
- `usageCount` (Number): Number of times used

**Indexes**:
- `barberId, isActive`: For barber's active tokens
- `token`: For token validation
- `expiresAt`: TTL index for auto-expiration

**Relationships**:
- References: `users._id`

### 6. Scan Logs Collection (`scanlogs`)

**Purpose**: Audit trail for cut usage

**Key Fields**:
- `userId` (ObjectId, Required): Reference to customer
- `barberId` (ObjectId, Required): Reference to barber
- `cutId` (ObjectId, Required): Reference to cut used
- `action` (String, Enum): 'scanned', 'used', 'expired', 'created'
- `shopToken` (String): Shop token used
- `ipAddress` (String): Client IP address
- `userAgent` (String): Client user agent
- `location` (String): Location data
- `notes` (String): Additional notes

**Indexes**:
- `userId, createdAt`: For customer's scan history
- `barberId, createdAt`: For barber's scan history
- `cutId`: For cut-specific logs
- `action, createdAt`: For action-based queries

**Relationships**:
- References: `users._id`, `cuts._id`

### 7. Cut History Collection (`cuthistory`)

**Purpose**: Historical cut management by admins

**Key Fields**:
- `userId` (String, Required): User ID
- `adminId` (String, Required): Admin ID
- `action` (String, Enum): 'used', 'added', 'expired', 'reset'
- `cutsAffected` (Number): Number of cuts affected
- `previousCount` (Number): Previous cut count
- `newCount` (Number): New cut count
- `notes` (String): Admin notes
- `metadata` (Object): Additional metadata

**Indexes**:
- `userId, createdAt`: For user's history
- `adminId, createdAt`: For admin's actions
- `action`: For action-based queries

### 8. Verification Codes Collection (`verificationcodes`)

**Purpose**: Email verification and password reset

**Key Fields**:
- `email` (String, Required): User email
- `code` (String, Required): Verification code
- `type` (String, Enum): 'email_verification', 'password_reset', 'login'
- `expiresAt` (Date, Required): Code expiration
- `used` (Boolean): Whether code was used
- `attempts` (Number): Number of attempts
- `metadata` (Object): Additional metadata

**Indexes**:
- `email, code`: For code validation
- `email, used`: For unused codes
- `type`: For type-based queries
- `expiresAt`: TTL index for auto-expiration

### 9. Sessions Collection (`sessions`)

**Purpose**: JWT token management

**Key Fields**:
- `userId` (ObjectId, Required): Reference to user
- `token` (String, Required, Unique): JWT token
- `tokenType` (String, Enum): 'access' or 'refresh'
- `expiresAt` (Date, Required): Token expiration
- `isActive` (Boolean): Token status
- `ipAddress` (String): Client IP
- `userAgent` (String): Client user agent
- `lastUsedAt` (Date): Last usage

**Indexes**:
- `userId, isActive`: For user's active sessions
- `token`: For token validation
- `expiresAt`: TTL index for auto-expiration

**Relationships**:
- References: `users._id`

### 10. Audit Logs Collection (`auditlogs`)

**Purpose**: System-wide audit trail

**Key Fields**:
- `userId` (ObjectId): Reference to user
- `action` (String, Required): Action performed
- `resource` (String, Required): Resource affected
- `resourceId` (String): Resource ID
- `details` (Mixed): Action details
- `ipAddress` (String): Client IP
- `userAgent` (String): Client user agent
- `success` (Boolean): Action success
- `errorMessage` (String): Error message if failed

**Indexes**:
- `userId, createdAt`: For user's audit trail
- `action, createdAt`: For action-based queries
- `resource, resourceId`: For resource-specific logs
- `success`: For success/failure analysis

**Relationships**:
- References: `users._id`

## Authentication Flow

### 1. User Registration
1. Create user in `users` collection
2. Generate verification code in `verificationcodes`
3. Send verification email
4. Create audit log entry

### 2. User Login
1. Find user by email in `users` collection
2. Verify password using bcrypt
3. Generate JWT token
4. Create session in `sessions` collection
5. Update `lastLoginAt` in user document
6. Create audit log entry

### 3. Admin Login
1. Find admin by email in `admins` collection
2. Verify password using bcrypt
3. Check permissions
4. Generate JWT token
5. Create session
6. Update `lastLoginAt`
7. Create audit log entry

### 4. Cut Usage Flow
1. Customer scans QR code
2. Validate shop token in `shoptokens`
3. Find available cut in `cuts` collection
4. Update cut status to 'used'
5. Create scan log entry
6. Update user's cut count
7. Create audit log entry

## Security Features

### 1. Password Security
- All passwords hashed with bcrypt (salt rounds: 10)
- Password comparison methods on user/admin models
- Pre-save middleware for automatic hashing

### 2. Token Security
- JWT tokens with expiration
- Session tracking in database
- TTL indexes for automatic cleanup
- Token blacklisting capability

### 3. Data Protection
- Email addresses indexed and normalized
- Referral codes with sparse indexing
- Unique constraints where appropriate
- Audit trail for all actions

### 4. Access Control
- Role-based permissions
- Admin permission system
- Session-based authentication
- IP address tracking

## Performance Optimizations

### 1. Indexing Strategy
- Compound indexes for common queries
- Sparse indexes for optional fields
- TTL indexes for automatic cleanup
- Text indexes for search functionality

### 2. Query Optimization
- Efficient lookups by email and ID
- Pagination support with skip/limit
- Aggregation pipelines for complex queries
- Projection to limit returned fields

### 3. Data Management
- Automatic timestamp management
- Soft deletes with `isActive` flags
- Batch operations for bulk updates
- Connection pooling

## Usage Examples

### Create a new user
\`\`\`javascript
const user = new User({
  email: 'user@example.com',
  password: 'securepassword',
  name: 'John Doe',
  phone: '+1234567890',
  role: 'customer'
});
await user.save();
\`\`\`

### Authenticate user
\`\`\`javascript
const user = await User.findOne({ email: 'user@example.com' });
const isValid = await user.comparePassword('password');
\`\`\`

### Create subscription
\`\`\`javascript
const subscription = new Subscription({
  userId: user._id,
  plan: 'monthly',
  cutsRemaining: 4,
  cutsTotal: 4,
  status: 'active'
});
await subscription.save();
\`\`\`

### Use a cut
\`\`\`javascript
const cut = await Cut.findOne({
  userId: user._id,
  monthYear: '2024-01',
  status: 'available'
});
cut.status = 'used';
cut.usedAt = new Date();
cut.barberId = barber._id;
await cut.save();
\`\`\`

## Migration Considerations

### 1. From Existing System
- Map existing user data to new schema
- Migrate subscription data
- Preserve audit trails
- Update application code

### 2. Data Validation
- Validate email formats
- Check for duplicate referral codes
- Ensure data consistency
- Update indexes

### 3. Performance Testing
- Test query performance
- Monitor index usage
- Optimize slow queries
- Load testing

## Maintenance

### 1. Regular Tasks
- Monitor index usage
- Clean up expired sessions
- Archive old audit logs
- Update statistics

### 2. Backup Strategy
- Regular database backups
- Point-in-time recovery
- Data validation
- Disaster recovery plan

### 3. Monitoring
- Query performance monitoring
- Error rate tracking
- User activity metrics
- System health checks
