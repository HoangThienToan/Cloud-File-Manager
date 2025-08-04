import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { withRateLimit, authRateLimit } from '@/lib/rate-limiter'
import { auditLogger, createRequestLogger } from '@/lib/logger'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

async function registerHandler(request: NextRequest) {
  const requestContext = createRequestLogger(request);
  
  try {
    const body = await request.json()
    const { email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email }
    })

    if (existingUser) {
      auditLogger.securityEvent({ 
        ...requestContext, 
        event: 'Registration attempt with existing credentials', 
        severity: 'low',
        metadata: { email }
      });
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    })

    // Generate token
    const token = generateToken(user.id)

    auditLogger.register({ ...requestContext, userId: user.id, email });

    return NextResponse.json({
      user,
      token
    }, { status: 201 })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    auditLogger.securityEvent({ 
      ...requestContext, 
      event: 'Registration failed', 
      severity: 'medium',
      error
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(authRateLimit, registerHandler);
