import { type NextRequest, NextResponse } from "next/server"
import { generateToken } from '@/lib/auth'
import { authenticateUser } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const user = await authenticateUser(email, password)

    // Generate token
    const token = generateToken(user)

    // Create response
    const response = NextResponse.json(
      { 
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 200 }
    )

    // Set cookie with httpOnly flag for security
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })

    return response
  } catch (error: any) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        success: false,
        message: error.message === 'Invalid credentials' ? 'Invalid email or password' : 'An error occurred during login'
      },
      { status: error.message === 'Invalid credentials' ? 401 : 500 }
    )
  }
}
