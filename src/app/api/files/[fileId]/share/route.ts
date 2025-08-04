import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { expiresIn } = await request.json()
    const file = await prisma.file.findFirst({
      where: { id: params.fileId, userId: user.id }
    })
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null
    const shareToken = uuidv4()
    const share = await prisma.share.create({
      data: {
        token: shareToken,
        fileId: file.id,
        userId: user.id,
        expiresAt
      }
    })
    const shareUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/files/share/${shareToken}`
    return NextResponse.json({ shareUrl, token: shareToken, expiresAt: share.expiresAt })
  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
  }
}
