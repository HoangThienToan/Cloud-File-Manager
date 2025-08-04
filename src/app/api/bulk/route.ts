import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { 
  asyncHandler, 
  successResponse, 
  ValidationError, 
  NotFoundError, 
  ConflictError
} from '@/lib/errors'
import { bulkOperationSchema } from '@/lib/validation'
import { withRateLimit, apiRateLimit } from '@/lib/rate-limiter'
import { auditLogger, createRequestLogger, perfLogger } from '@/lib/logger'
import { invalidateCache } from '@/lib/cache'
import { jobs } from '@/lib/background-jobs'
import fs from 'fs/promises'
import path from 'path'
import archiver from 'archiver'
import { createWriteStream } from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// POST /api/bulk - Handle bulk operations
const bulkHandler = asyncHandler(async (request: NextRequest) => {
  const requestContext = createRequestLogger(request);
  const startTime = Date.now();
  
  const user = await getAuthenticatedUser(request)
  if (!user) {
    throw new ValidationError('Unauthorized')
  }

  const body = await request.json()
  const { action, itemIds, targetFolderId, archiveName } = bulkOperationSchema.parse(body)

  switch (action) {
    case 'delete':
      return await handleBulkDelete(itemIds, user.id)
    case 'move':
      return await handleBulkMove(itemIds, targetFolderId, user.id)
    case 'copy':
      return await handleBulkCopy(itemIds, targetFolderId, user.id)
    case 'compress':
      return await handleBulkCompress(itemIds, user.id, archiveName)
    default:
      throw new ValidationError('Invalid action')
  }
})

async function handleBulkDelete(itemIds: string[], userId: string) {
  const files = await prisma.file.findMany({
    where: { id: { in: itemIds }, userId },
    select: { id: true, storageName: true, name: true }
  })

  const folders = await prisma.folder.findMany({
    where: { id: { in: itemIds }, userId },
    select: { id: true, name: true }
  })

  if (files.length + folders.length === 0) {
    throw new NotFoundError('No items found to delete')
  }

  // Delete files from filesystem
  for (const file of files) {
    try {
      const filePath = path.join(UPLOAD_DIR, userId, file.storageName)
      await fs.unlink(filePath)
    } catch (error) {
      console.error(`Failed to delete file ${file.storageName}:`, error)
    }
  }

  // Delete from database
  await prisma.$transaction([
    prisma.file.deleteMany({
      where: { id: { in: files.map(f => f.id) }, userId }
    }),
    prisma.folder.deleteMany({
      where: { id: { in: folders.map(f => f.id) }, userId }
    })
  ])

  return successResponse(
    { deletedFiles: files.length, deletedFolders: folders.length },
    `Successfully deleted ${files.length} files and ${folders.length} folders`
  )
}

async function handleBulkMove(itemIds: string[], targetFolderId: string | null, userId: string) {
  // Verify target folder exists and belongs to user
  if (targetFolderId) {
    const targetFolder = await prisma.folder.findFirst({
      where: { id: targetFolderId, userId }
    })
    if (!targetFolder) {
      throw new NotFoundError('Target folder not found')
    }
  }

  // Move files
  const files = await prisma.file.findMany({
    where: { id: { in: itemIds }, userId }
  })

  // Move folders
  const folders = await prisma.folder.findMany({
    where: { id: { in: itemIds }, userId }
  })

  if (files.length + folders.length === 0) {
    throw new NotFoundError('No items found to move')
  }

  // Check for naming conflicts
  const existingFiles = await prisma.file.findMany({
    where: { folderId: targetFolderId, userId }
  })

  const existingFolders = await prisma.folder.findMany({
    where: { parentId: targetFolderId, userId }
  })

  const existingNames = [
    ...existingFiles.map(f => f.name.toLowerCase()),
    ...existingFolders.map(f => f.name.toLowerCase())
  ]

  const conflicts = [
    ...files.filter(f => existingNames.includes(f.name.toLowerCase())),
    ...folders.filter(f => existingNames.includes(f.name.toLowerCase()))
  ]

  if (conflicts.length > 0) {
    throw new ConflictError(`Name conflicts found: ${conflicts.map(c => c.name).join(', ')}`)
  }

  // Perform move
  await prisma.$transaction([
    prisma.file.updateMany({
      where: { id: { in: files.map(f => f.id) }, userId },
      data: { folderId: targetFolderId }
    }),
    prisma.folder.updateMany({
      where: { id: { in: folders.map(f => f.id) }, userId },
      data: { parentId: targetFolderId }
    })
  ])

  return successResponse(
    { movedFiles: files.length, movedFolders: folders.length },
    `Successfully moved ${files.length} files and ${folders.length} folders`
  )
}

async function handleBulkCopy(itemIds: string[], targetFolderId: string | null, userId: string) {
  // Verify target folder exists and belongs to user
  if (targetFolderId) {
    const targetFolder = await prisma.folder.findFirst({
      where: { id: targetFolderId, userId }
    })
    if (!targetFolder) {
      throw new NotFoundError('Target folder not found')
    }
  }

  const files = await prisma.file.findMany({
    where: { id: { in: itemIds }, userId }
  })

  const folders = await prisma.folder.findMany({
    where: { id: { in: itemIds }, userId }
  })

  if (files.length + folders.length === 0) {
    throw new NotFoundError('No items found to copy')
  }

  let copiedFiles = 0
  let copiedFolders = 0

  // Copy files
  for (const file of files) {
    const newName = await generateUniqueFileName(file.name, targetFolderId, userId)
    const newStorageName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.originalName}`
    
    // Copy physical file
    const sourceFile = path.join(UPLOAD_DIR, userId, file.storageName)
    const targetFile = path.join(UPLOAD_DIR, userId, newStorageName)
    
    try {
      await fs.copyFile(sourceFile, targetFile)
      
      // Create database entry
      await prisma.file.create({
        data: {
          name: newName,
          originalName: file.originalName,
          storageName: newStorageName,
          mimeType: file.mimeType,
          size: file.size,
          userId,
          folderId: targetFolderId
        }
      })
      
      copiedFiles++
    } catch (error) {
      console.error(`Failed to copy file ${file.name}:`, error)
    }
  }

  // Copy folders (simplified - just create new folders, not recursive copy)
  for (const folder of folders) {
    const newName = await generateUniqueFolderName(folder.name, targetFolderId, userId)
    
    try {
      await prisma.folder.create({
        data: {
          name: newName,
          path: targetFolderId ? `${targetFolderId}/${newName}` : newName,
          parentId: targetFolderId,
          userId
        }
      })
      
      copiedFolders++
    } catch (error) {
      console.error(`Failed to copy folder ${folder.name}:`, error)
    }
  }

  return successResponse(
    { copiedFiles, copiedFolders },
    `Successfully copied ${copiedFiles} files and ${copiedFolders} folders`
  )
}

async function handleBulkCompress(itemIds: string[], userId: string, archiveName?: string) {
  const files = await prisma.file.findMany({
    where: { id: { in: itemIds }, userId }
  })

  if (files.length === 0) {
    throw new NotFoundError('No files found to compress')
  }

  const zipName = archiveName || `archive_${Date.now()}.zip`
  const zipStorageName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${zipName}`
  const zipPath = path.join(UPLOAD_DIR, userId, zipStorageName)

  // Ensure user directory exists
  const userDir = path.join(UPLOAD_DIR, userId)
  await fs.mkdir(userDir, { recursive: true })

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', async () => {
      try {
        const stats = await fs.stat(zipPath)
        
        // Create database entry for the zip file
        const zipFile = await prisma.file.create({
          data: {
            name: zipName,
            originalName: zipName,
            storageName: zipStorageName,
            mimeType: 'application/zip',
            size: stats.size,
            userId,
            folderId: null // Save to root folder
          }
        })

        resolve(successResponse(
          { 
            zipFile: {
              id: zipFile.id,
              name: zipFile.name,
              size: stats.size,
              formattedSize: formatFileSize(stats.size)
            },
            compressedFiles: files.length 
          },
          `Successfully compressed ${files.length} files into ${zipName}`
        ))
      } catch (error) {
        reject(error)
      }
    })

    archive.on('error', (err: Error) => {
      reject(err)
    })

    archive.pipe(output)

    // Add files to archive
    files.forEach(file => {
      const filePath = path.join(UPLOAD_DIR, userId, file.storageName)
      archive.file(filePath, { name: file.name })
    })

    archive.finalize()
  })
}

async function generateUniqueFileName(baseName: string, folderId: string | null, userId: string): Promise<string> {
  let counter = 1
  let newName = baseName
  
  while (true) {
    const existing = await prisma.file.findFirst({
      where: { name: newName, folderId, userId }
    })
    
    if (!existing) break
    
    const nameParts = baseName.split('.')
    if (nameParts.length > 1) {
      const extension = nameParts.pop()
      const nameWithoutExt = nameParts.join('.')
      newName = `${nameWithoutExt} (${counter}).${extension}`
    } else {
      newName = `${baseName} (${counter})`
    }
    
    counter++
  }
  
  return newName
}

async function generateUniqueFolderName(baseName: string, parentId: string | null, userId: string): Promise<string> {
  let counter = 1
  let newName = baseName
  
  while (true) {
    const existing = await prisma.folder.findFirst({
      where: { name: newName, parentId, userId }
    })
    
    if (!existing) break
    
    newName = `${baseName} (${counter})`
    counter++
  }
  
  return newName
}

export const POST = withRateLimit(apiRateLimit, bulkHandler);

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}
