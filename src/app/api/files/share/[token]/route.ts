import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const share = await prisma.share.findUnique({
      where: { token: params.token },
      include: { file: true }
    })
    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 })
    }
    try {
      await fs.access(share.file.path)
    } catch {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }
    const fileBuffer = await fs.readFile(share.file.path)
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': share.file.mimeType,
        'Content-Disposition': `attachment; filename="${share.file.name}"`,
        'Content-Length': share.file.size.toString()
      }
    })
  } catch (error) {
    console.error('Shared download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
