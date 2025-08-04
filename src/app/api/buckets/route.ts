import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

// GET /api/buckets - Lấy danh sách bucket của user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    const buckets = await prisma.bucket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ buckets })
  } catch (error) {
    console.error('Get buckets error:', error)
    return NextResponse.json(
      { error: 'Failed to get buckets' },
      { status: 500 }
    )
  }
}

// POST /api/buckets - Tạo bucket mới
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    const { name } = await request.json()
    
    // Reserved bucket names (system routes)
    const reservedNames = [
      'api', 'login', 'register', 'settings', 'demo', 'admin',
      'files', 'public', 'static', 'assets', 'images', 'docs',
      'help', 'support', 'about', 'contact', 'privacy', 'terms',
      'dashboard', 'profile', 'account', 'billing', 'pricing',
      'www', 'mail', 'ftp', 'blog', 'forum', 'wiki', 'cdn',
      'status', 'health', 'ping', 'test', 'staging', 'dev'
    ]
    
    // Check if bucket name is reserved
    if (reservedNames.includes(name.toLowerCase())) {
      return NextResponse.json(
        { error: `Bucket name "${name}" is reserved. Please choose a different name.` },
        { status: 400 }
      )
    }
    
    // Validate bucket name (chỉ cho phép a-z, 0-9, dấu gạch ngang)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return NextResponse.json(
        { error: 'Bucket name can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }
    
    // Kiểm tra độ dài
    if (name.length < 3 || name.length > 50) {
      return NextResponse.json(
        { error: 'Bucket name must be between 3 and 50 characters' },
        { status: 400 }
      )
    }
    
    // Kiểm tra tên bucket đã tồn tại chưa (global unique)
    const existingBucket = await prisma.bucket.findUnique({
      where: { name }
    })
    
    if (existingBucket) {
      return NextResponse.json(
        { error: 'Bucket name already exists' },
        { status: 409 }
      )
    }
    
    const bucket = await prisma.bucket.create({
      data: {
        name,
        userId: user.id
      }
    })
    
    return NextResponse.json({ bucket })
  } catch (error) {
    console.error('Create bucket error:', error)
    return NextResponse.json(
      { error: 'Failed to create bucket' },
      { status: 500 }
    )
  }
}
