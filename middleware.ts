import { type NextRequest, NextResponse } from 'next/server'

// Simple JWT verification for Edge Runtime
async function verifyTokenEdge(token: string, secret: string) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const base64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const binarySignature = atob(base64);
    const signature = new Uint8Array(binarySignature.length);
    for (let i = 0; i < binarySignature.length; i++) {
      signature[i] = binarySignature.charCodeAt(i);
    }
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!isValid) return null;
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    return null;
  }
}

// In-memory rate limiting (Note: resets per instance/deployment in serverless)
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const ip = request.ip || 'anonymous'

  // 1. Basic Rate Limiting for Auth APIs
  if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/signup') || path.startsWith('/api/send-verification-code') || path.startsWith('/api/auth/verify-email') || path.startsWith('/api/auth/forgot-password')) {
    const now = Date.now();
    const limitInfo = rateLimitMap.get(ip);

    if (limitInfo && now < limitInfo.resetTime) {
      if (limitInfo.count >= 10) { // Limit to 10 requests per minute
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
      }
      limitInfo.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute window
    }
  }

  // 2. Route Protection
  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin')
  const isUserRoute = path.startsWith('/dashboard') ||
                      path.startsWith('/scan') ||
                      path.startsWith('/referral') ||
                      path.startsWith('/profile') ||
                      path.startsWith('/account') ||
                      path.startsWith('/api/user')

  if (isAdminRoute || isUserRoute) {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured — refusing all authenticated requests')
      if (path.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 })
      }
      return NextResponse.redirect(new URL('/', request.url))
    }

    const token = request.cookies.get('token')?.value ||
                  request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyTokenEdge(token, jwtSecret)

    if (!payload) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }

    if (isAdminRoute && payload.role !== 'admin') {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
    '/scan/:path*',
    '/referral/:path*',
    '/profile/:path*',
    '/account/:path*',
    '/api/user/:path*',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/send-verification-code',
    '/api/auth/verify-email',
    '/api/auth/forgot-password',
  ],
}
