import jwt from 'jsonwebtoken'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return secret
}

export interface JWTPayload {
  userId: string
  email: string
  name: string
  role: string
}

export function generateToken(user: any): string {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role
  }

  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

// jwt.verify() throws (invalid signature, malformed token, expired token,
// etc.) rather than returning a falsy value — but every one of this
// function's 40+ callers across the API routes was written assuming the
// opposite (`const payload = verifyToken(token); if (!payload) return 401`),
// a contract this implementation never actually honored. In production that
// meant any customer with an expired or otherwise invalid token (a routine,
// expected occurrence — tokens are only valid 7 days) got an uncaught
// exception and a generic "Internal server error" instead of a clean
// "please sign in again", on every authenticated route in the app.
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload
  } catch {
    return null
  }
}
