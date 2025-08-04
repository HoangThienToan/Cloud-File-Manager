import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// GET /api/bucket/[bucket]/[...path] - Public file access via bucket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
  try {
    const { bucket: bucketName, path: pathSegments } = await params
    console.log('Bucket file access:', bucketName, pathSegments)
    
    // Tìm bucket
    const bucket = await prisma.bucket.findUnique({
      where: { name: bucketName },
      include: { user: true }
    })
    
    if (!bucket) {
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      )
    }
    
    // Xây dựng đường dẫn file từ path segments
    const fileName = pathSegments[pathSegments.length - 1]
    
    // Tìm file trong database theo tên và userId
    const file = await prisma.file.findFirst({
      where: {
        userId: bucket.userId,
        OR: [
          { name: fileName },
          { originalName: fileName }
        ]
      }
    })
    
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    // Đọc file từ disk
    const actualFilePath = path.join(UPLOAD_DIR, bucket.userId, file.storageName || file.name)
    console.log('Reading file from:', actualFilePath)
    
    try {
      const fileBuffer = await fs.readFile(actualFilePath)
      
      // Xác định content type
      const ext = path.extname(file.name).toLowerCase()
      const contentTypeMap: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.json': 'application/json',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.html': 'text/html',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav'
      }
      
      const contentType = file.mimeType || contentTypeMap[ext] || 'application/octet-stream'
      
      // Xác định có nên hiển thị inline hay download
      const viewableTypes = ['image/', 'text/', 'application/pdf', 'video/', 'audio/']
      const isViewable = viewableTypes.some(type => contentType.startsWith(type))
      
      const headers = new Headers()
      headers.set('Content-Type', contentType)
      headers.set('Content-Length', fileBuffer.length.toString())
      headers.set('Cache-Control', 'public, max-age=3600')
      
      if (isViewable) {
        headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`)
      } else {
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`)
      }
      
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
    console.error('Bucket file access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
