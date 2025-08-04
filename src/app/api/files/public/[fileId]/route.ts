import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// GET /api/files/public/[fileId] - Public file access without authentication
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params
    console.log('Public file access requested for:', fileId)

    // Find file in database (no user authentication required)
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    })
    
    console.log('File found in database:', !!file)

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Construct file path
    const userFolder = file.userId || 'default'
    const storageName = file.storageName || file.name
    const filePath = path.join(UPLOAD_DIR, userFolder, storageName)
    
    console.log('File path constructed:', filePath)

    try {
      // Check if file exists
      await fs.access(filePath)
      
      // Read file
      const fileBuffer = await fs.readFile(filePath)
      
      // Set appropriate headers for different file types
      const headers = new Headers()
      
      // Set Content-Type based on file mime type
      if (file.mimeType) {
        headers.set('Content-Type', file.mimeType)
      }
      
      // For viewable files, set inline disposition
      const viewableTypes = ['image/', 'text/', 'application/pdf', 'video/', 'audio/']
      const isViewable = viewableTypes.some(type => file.mimeType?.startsWith(type))
      
      if (isViewable) {
        headers.set('Content-Disposition', `inline; filename="${file.name}"`)
      } else {
        headers.set('Content-Disposition', `attachment; filename="${file.name}"`)
      }
      
      headers.set('Content-Length', file.size.toString())
      headers.set('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
      
      return new NextResponse(fileBuffer as BodyInit, {
        status: 200,
        headers
      })
      
    } catch (error) {
      console.error('File access error:', error)
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Public file access error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
