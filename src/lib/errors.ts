import { NextRequest, NextResponse } from 'next/server'

// Error classes for different types of errors
export class APIError extends Error {
  statusCode: number
  code: string
  
  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'APIError'
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN_ERROR')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR')
    this.name = 'ConflictError'
  }
}

// Standard error response handler
export function handleAPIError(error: any): NextResponse {
  console.error('API Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    code: error.code,
    timestamp: new Date().toISOString()
  })
  
  if (error instanceof APIError) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message, 
        code: error.code,
        timestamp: new Date().toISOString()
      },
      { status: error.statusCode }
    )
  }
  
  // Handle Prisma errors
  if (error.code === 'P2002') {
    return NextResponse.json(
      { 
        success: false,
        error: 'Duplicate entry', 
        code: 'DUPLICATE_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 409 }
    )
  }
  
  if (error.code === 'P2025') {
    return NextResponse.json(
      { 
        success: false,
        error: 'Record not found', 
        code: 'NOT_FOUND_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 404 }
    )
  }
  
  // Default error response
  return NextResponse.json(
    { 
      success: false,
      error: 'Internal server error', 
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}

// Standard success response
export function successResponse(data: any, message?: string, statusCode = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message: message || 'Operation successful',
    timestamp: new Date().toISOString()
  }, { status: statusCode })
}

// Paginated response
export function paginatedResponse(
  data: any[], 
  page: number, 
  limit: number, 
  total: number,
  message?: string
): NextResponse {
  const totalPages = Math.ceil(total / limit)
  
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    message: message || 'Data retrieved successfully',
    timestamp: new Date().toISOString()
  })
}

// Async error wrapper for route handlers
export function asyncHandler(handler: (request: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleAPIError(error)
    }
  }
}
