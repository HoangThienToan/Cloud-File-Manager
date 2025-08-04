import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AdmZip from 'adm-zip'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId, folderId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Lấy thông tin file ZIP
    const zipFile = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: user.id,
        mimeType: 'application/zip'
      }
    })

    if (!zipFile) {
      return NextResponse.json({ error: 'ZIP file not found' }, { status: 404 })
    }

    // Kiểm tra file có tồn tại trên disk không
    try {
      await fs.access(zipFile.path)
    } catch {
      return NextResponse.json({ error: 'ZIP file not found on disk' }, { status: 404 })
    }

    // Giải nén file
    const zip = new AdmZip(zipFile.path)
    const entries = zip.getEntries()
    
    const extractedFiles = []
    const uploadDir = path.join(process.cwd(), 'uploads', user.id)

    // Đảm bảo thư mục tồn tại
    await fs.mkdir(uploadDir, { recursive: true })

    for (const entry of entries) {
      if (!entry.isDirectory) {
        const fileId = uuidv4()
        const fileName = entry.entryName
        const filePath = path.join(uploadDir, `${fileId}_${fileName}`)
        
        try {
          // Ghi file ra disk
          const fileBuffer = entry.getData()
          await fs.writeFile(filePath, fileBuffer)

          // Lưu thông tin file vào database
          const savedFile = await prisma.file.create({
            data: {
              id: fileId,
              name: fileName,
              originalName: fileName,
              path: filePath,
              size: fileBuffer.length,
              mimeType: getMimeType(fileName),
              userId: user.id,
              folderId: folderId || null,
              storageName: `${fileId}_${fileName}`
            }
          })

          extractedFiles.push({
            id: savedFile.id,
            name: savedFile.name,
            size: savedFile.size,
            mimeType: savedFile.mimeType
          })
        } catch (error) {
          console.error(`Error extracting file ${fileName}:`, error)
        }
      }
    }

    return NextResponse.json({
      message: `Successfully extracted ${extractedFiles.length} files`,
      files: extractedFiles
    })

  } catch (error) {
    console.error('Extract files error:', error)
    return NextResponse.json({ error: 'Failed to extract files' }, { status: 500 })
  }
}

// Helper function để xác định MIME type
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const mimeTypes: { [key: string]: string } = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg'
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}
