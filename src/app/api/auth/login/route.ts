import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'
import { withRateLimit, authRateLimit } from '@/lib/rate-limiter'
import { auditLogger, createRequestLogger } from '@/lib/logger'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

async function loginHandler(request: NextRequest) {
  const requestContext = createRequestLogger(request);
  
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    auditLogger.loginAttempt({ ...requestContext, success: false, email });

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      auditLogger.loginFailure({ ...requestContext, email, reason: 'User not found' });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      auditLogger.loginFailure({ ...requestContext, email, reason: 'Invalid password' });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate token
    const token = generateToken(user.id)

    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      createdAt: user.createdAt
    }

    auditLogger.loginSuccess({ ...requestContext, userId: user.id, email });

    return NextResponse.json({
      user: userResponse,
      token
    })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      auditLogger.loginFailure({ ...requestContext, reason: 'Validation error', error: error.message });
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    auditLogger.loginFailure({ ...requestContext, reason: 'Server error', error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(authRateLimit, loginHandler);
