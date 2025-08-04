import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, formatFileSize } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const files = await prisma.file.findMany({
      where: { userId: user.id, folderId: folderId || null },
      select: { id: true, name: true, size: true, mimeType: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' }
    })
    const filesWithSize = files.map((file: { id: string, name: string, size: number, mimeType: string, createdAt: Date, updatedAt: Date }) => ({ ...file, formattedSize: formatFileSize(file.size) }))
    return NextResponse.json({ files: filesWithSize })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}
