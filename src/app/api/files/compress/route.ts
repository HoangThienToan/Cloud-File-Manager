import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import archiver from 'archiver'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileIds, folderIds = [], zipName } = await request.json()

    if (!fileIds || fileIds.length === 0) {
      return NextResponse.json({ error: 'No files selected' }, { status: 400 })
    }

    // Lấy thông tin files
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId: user.id
      }
    })

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files found' }, { status: 404 })
    }

    // Tạo tên file ZIP
    const fileName = zipName || `archive_${Date.now()}.zip`
    const zipId = uuidv4()
    const zipPath = path.join(process.cwd(), 'uploads', user.id, `${zipId}_${fileName}`)

    // Đảm bảo thư mục tồn tại
    await fs.mkdir(path.dirname(zipPath), { recursive: true })

    // Tạo file ZIP
    const output = require('fs').createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        try {
          // Lưu thông tin file ZIP vào database
          const zipFile = await prisma.file.create({
            data: {
              id: zipId,
              name: fileName,
              originalName: fileName,
              path: zipPath,
              size: archive.pointer(),
              mimeType: 'application/zip',
              userId: user.id,
              folderId: null,
              storageName: `${zipId}_${fileName}`
            }
          })

          resolve(NextResponse.json({
            message: 'Files compressed successfully',
            file: {
              id: zipFile.id,
              name: zipFile.name,
              size: zipFile.size,
              downloadUrl: `/api/files/${zipFile.id}/download`
            }
          }))
        } catch (error) {
          console.error('Error saving ZIP file:', error)
          reject(NextResponse.json({ error: 'Failed to save ZIP file' }, { status: 500 }))
        }
      })

      output.on('error', (err) => {
        console.error('ZIP creation error:', err)
        reject(NextResponse.json({ error: 'Failed to create ZIP file' }, { status: 500 }))
      })

      archive.pipe(output)

      // Thêm từng file vào archive
      files.forEach(file => {
        try {
          archive.file(file.path, { name: file.name })
        } catch (error) {
          console.error(`Error adding file ${file.name} to archive:`, error)
        }
      })

      archive.finalize()
    })

  } catch (error) {
    console.error('Compress files error:', error)
    return NextResponse.json({ error: 'Failed to compress files' }, { status: 500 })
  }
}
