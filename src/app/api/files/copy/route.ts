import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { generateUniqueName } from '../../../../lib/nameUtils';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    let user;
    try {
      user = await getAuthenticatedUser(request);
    } catch (authError) {
      // If no auth, try to use default user (for development)
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      user = defaultUser;
    }

    const { sourceId, targetParentId } = await request.json();

    if (!sourceId) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }

    // Get source file
    const sourceFile = await prisma.file.findUnique({
      where: { 
        id: sourceId,
        userId: user.id  // Ensure user owns the file
      }
    });

    if (!sourceFile) {
      return NextResponse.json({ error: 'Source file not found or access denied' }, { status: 404 });
    }

    // Validate target parent (if specified)
    if (targetParentId) {
      const targetParent = await prisma.folder.findUnique({
        where: { 
          id: targetParentId,
          userId: user.id
        }
      });

      if (!targetParent) {
        return NextResponse.json({ error: 'Target parent folder not found or access denied' }, { status: 404 });
      }
    }

    // Generate unique name
    const uniqueName = await generateUniqueName(
      sourceFile.name,
      user.id,
      targetParentId,
      'file'
    );

    // Generate new storage name for the copy
    const newStorageName = sourceFile.storageName ? `${uuidv4()}_${uniqueName}` : null;
    
    if (sourceFile.storageName && newStorageName) {
      const sourcePath = path.join(process.cwd(), 'uploads', user.id, sourceFile.storageName);
      const targetPath = path.join(process.cwd(), 'uploads', user.id, newStorageName);

      // Copy the physical file if it exists
      if (fs.existsSync(sourcePath)) {
        // Ensure target directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.copyFileSync(sourcePath, targetPath);
      }
    }

    // Create new database record
    const copiedFile = await prisma.file.create({
      data: {
        name: uniqueName,
        originalName: sourceFile.originalName,
        storageName: newStorageName,
        size: sourceFile.size,
        mimeType: sourceFile.mimeType,
        path: sourceFile.path,
        userId: user.id,
        folderId: targetParentId || null
      }
    });

    return NextResponse.json(copiedFile);
  } catch (error) {
    console.error('Copy file error:', error);
    return NextResponse.json(
      { error: `Failed to copy file: ${error}` },
      { status: 500 }
    );
  }
}
