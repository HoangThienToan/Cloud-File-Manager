import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, sanitizeFileName, isAllowedFileType, getFileExtension } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { withRateLimit, uploadRateLimit } from '@/lib/rate-limiter'
import { auditLogger, createRequestLogger, perfLogger } from '@/lib/logger'
import { cache, invalidateCache, CACHE_DURATIONS } from '@/lib/cache'
import { jobs } from '@/lib/background-jobs'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

async function uploadHandler(request: NextRequest) {
  const requestContext = createRequestLogger(request);
  const startTime = Date.now();
  
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    requestContext.userId = user.id;

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string || null

    requestContext.folderId = folderId || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Danh sách extension an toàn (whitelist)
    const allowedExts = [
      'pdf','png','jpg','jpeg','gif','webp','txt','csv','doc','docx','xls','xlsx','zip','rar','7z','tar','gz','ppt','pptx','md'
    ];
    // Kiểm tra trùng tên (file hoặc folder) trong cùng folderId (không phân biệt hoa thường)
    const fileNameLower = file.name.trim().toLowerCase();
    const dupFile = await prisma.file.findFirst({
      where: {
        userId: user.id,
        folderId: folderId,
      },
    });
    const dupFolder = await prisma.folder.findFirst({
      where: {
        userId: user.id,
        parentId: folderId,
      },
    });
    if (dupFolder && dupFolder.name.trim().toLowerCase() === fileNameLower) {
      return NextResponse.json({ error: 'Đã có thư mục cùng tên trong thư mục này!' }, { status: 400 });
    }
    if (dupFile && dupFile.name.trim().toLowerCase() === fileNameLower) {
      return NextResponse.json({ error: 'Đã có tệp cùng tên trong thư mục này!' }, { status: 400 });
    }
    const ext = getFileExtension(file.name)
    
    // Debug: Log file info
    console.log('File upload debug:', {
      fileName: file.name,
      mimeType: file.type,
      extension: ext,
      isAllowedType: isAllowedFileType(file.type),
      isAllowedExt: allowedExts.includes(ext)
    });

    // Kiểm tra kiểu file - cho phép nếu MIME type hoặc extension hợp lệ
    const isMimeTypeAllowed = isAllowedFileType(file.type);
    const isExtensionAllowed = allowedExts.includes(ext);
    
    if (!isMimeTypeAllowed && !isExtensionAllowed) {
      return NextResponse.json({ 
        error: `File type not allowed. File: ${file.name}, Type: ${file.type}, Extension: ${ext}` 
      }, { status: 400 })
    }

    const userDir = path.join(UPLOAD_DIR, user.id)
    await fs.mkdir(userDir, { recursive: true })

    const fileId = uuidv4()
    const sanitizedFileName = sanitizeFileName(file.name)
    let fileName = `${fileId}_${sanitizedFileName}`
    let filePath = path.join(userDir, fileName)
    let storageName = fileName
    let mimeType = file.type
    let size = file.size

    const arrayBuffer = await file.arrayBuffer()
    let fileBuffer = Buffer.from(arrayBuffer)

    // Nếu file lớn hơn 10MB hoặc có nguy cơ, nén lại thành .zip
    if (file.size > 10 * 1024 * 1024 || ['zip','rar','7z','tar','gz','js','jar','exe','bat','sh','msi','dll','php','py','pl','apk','com','scr','vbs','cmd'].includes(ext)) {
      const AdmZip = require('adm-zip')
      const zip = new AdmZip()
      zip.addFile(sanitizedFileName, fileBuffer)
      fileName = `${fileId}_${sanitizedFileName}.zip`
      filePath = path.join(userDir, fileName)
      fileBuffer = zip.toBuffer()
      mimeType = 'application/zip'
      size = fileBuffer.length
      storageName = fileName
    }

    await fs.writeFile(filePath, fileBuffer)

    const savedFile = await prisma.file.create({
      data: {
        id: fileId,
        name: file.name,
        originalName: file.name,
        path: filePath,
        size: size,
        mimeType: mimeType,
        userId: user.id,
        folderId: folderId,
        storageName: storageName
      }
    })

    // Invalidate relevant caches
    invalidateCache.userFiles(user.id, folderId || undefined);
    invalidateCache.user(user.id);

    // Schedule user storage recalculation
    jobs.calculateUserStorage(user.id);

    const duration = Date.now() - startTime;
    auditLogger.fileUpload({ 
      ...requestContext, 
      fileId: savedFile.id,
      fileName: savedFile.name, 
      fileSize: savedFile.size 
    });
    
    perfLogger.fileOperation({ 
      ...requestContext, 
      operation: 'upload', 
      duration, 
      success: true 
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      file: {
        id: savedFile.id,
        name: savedFile.name,
        size: savedFile.size,
        type: mimeType, // Use the mimeType variable since the DB field mapping might be different
        createdAt: savedFile.createdAt,
        storageName: savedFile.storageName
      }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime;
    perfLogger.fileOperation({ 
      ...requestContext, 
      operation: 'upload', 
      duration, 
      success: false,
      error 
    });
    
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export const POST = withRateLimit(uploadRateLimit, uploadHandler);
