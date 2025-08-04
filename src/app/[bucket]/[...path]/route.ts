import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// GET /[bucket]/[...path] - Clean bucket-based public file access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
  try {
    const { bucket: bucketName, path: pathSegments } = await params
    console.log('Clean bucket file access:', bucketName, pathSegments)

    // Tìm bucket
    const bucket = await (prisma as any).bucket.findUnique({
      where: { name: bucketName },
      include: { user: true }
    })

    if (!bucket) {
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      )
    }

    // Reconstruct filename từ path segments
    const filename = pathSegments.join('/')
    console.log('Looking for file:', filename)

    // Tìm file trong database
    // Có thể tìm theo exact filename hoặc theo pattern
    const file = await prisma.file.findFirst({
      where: {
        userId: bucket.userId,
        OR: [
          { name: filename },
          { name: decodeURIComponent(filename) },
          // Also try matching just the final filename part
          { name: pathSegments[pathSegments.length - 1] },
          { name: decodeURIComponent(pathSegments[pathSegments.length - 1]) }
        ]
      }
    })

    if (!file) {
      console.log('File not found in database')
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    console.log('File found in database:', file.name)

    // Construct file path on disk
    const userFolder = bucket.userId
    const storageName = file.storageName || file.name
    const filePath = path.join(UPLOAD_DIR, userFolder, storageName)
    
    console.log('Reading file from:', filePath)

    try {
      // Check if file exists and read it
      await fs.access(filePath)
      const fileBuffer = await fs.readFile(filePath)
      
      // Set appropriate headers
      const headers = new Headers()
      
      if (file.mimeType) {
        headers.set('Content-Type', file.mimeType)
      }
      
      // For viewable files, set inline disposition
      const viewableTypes = ['image/', 'text/', 'application/pdf', 'video/', 'audio/']
      const isViewable = viewableTypes.some(type => file.mimeType?.startsWith(type))
      
      if (isViewable) {
        headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`)
      } else {
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`)
      }
      
      headers.set('Content-Length', file.size.toString())
      headers.set('Cache-Control', 'public, max-age=3600')
      
      return new NextResponse(fileBuffer as BodyInit, {
        status: 200,
        headers
      })
      
    } catch (fileError) {
      console.error('File read error:', fileError)
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Clean bucket file access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
