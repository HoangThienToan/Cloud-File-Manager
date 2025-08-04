import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'

export async function DELETE(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    // Next.js App Router: params là Promise, cần await
    const awaitedParams = await params;
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const file = await prisma.file.findFirst({
      where: { id: awaitedParams.fileId, userId: user.id }
    })
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    try {
      await fs.unlink(file.path)
    } catch (error) {
      console.warn('File not found on disk:', file.path)
    }
    await prisma.file.delete({ where: { id: awaitedParams.fileId } })
    return NextResponse.json({ message: 'File deleted successfully' })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
