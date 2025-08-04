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

    // Get source folder
    const sourceFolder = await prisma.folder.findUnique({
      where: { 
        id: sourceId,
        userId: user.id  // Ensure user owns the folder
      }
    });

    if (!sourceFolder) {
      return NextResponse.json({ error: 'Source folder not found or access denied' }, { status: 404 });
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
      sourceFolder.name,
      user.id,
      targetParentId,
      'folder'
    );

    // Create path for the new folder
    let newPath = `/${uniqueName}`;
    if (targetParentId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { id: targetParentId }
      });
      if (parentFolder) {
        newPath = `${parentFolder.path}/${uniqueName}`;
      }
    }

    // Create new folder record
    const copiedFolder = await prisma.folder.create({
      data: {
        name: uniqueName,
        path: newPath,
        userId: user.id,
        parentId: targetParentId || null
      }
    });

    // Recursively copy all contents
    await copyFolderContents(sourceFolder.id, copiedFolder.id, user.id);

    return NextResponse.json(copiedFolder);
  } catch (error) {
    console.error('Copy folder error:', error);
    return NextResponse.json(
      { error: `Failed to copy folder: ${error}` },
      { status: 500 }
    );
  }
}

// Helper function to recursively copy folder contents
async function copyFolderContents(sourceFolderId: string, targetFolderId: string, userId: string) {
  try {
    // Get all files in source folder
    const sourceFiles = await prisma.file.findMany({
      where: {
        folderId: sourceFolderId,
        userId: userId
      }
    });

    // Copy each file
    for (const sourceFile of sourceFiles) {
      const uniqueName = await generateUniqueName(
        sourceFile.name,
        userId,
        targetFolderId,
        'file'
      );

      // Generate new storage name for the copy
      const newStorageName = sourceFile.storageName ? `${uuidv4()}_${uniqueName}` : null;
      
      if (sourceFile.storageName && newStorageName) {
        const sourcePath = path.join(process.cwd(), 'uploads', userId, sourceFile.storageName);
        const targetPath = path.join(process.cwd(), 'uploads', userId, newStorageName);

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

      // Create new file record
      await prisma.file.create({
        data: {
          name: uniqueName,
          originalName: sourceFile.originalName,
          storageName: newStorageName,
          size: sourceFile.size,
          mimeType: sourceFile.mimeType,
          path: sourceFile.path,
          userId: userId,
          folderId: targetFolderId
        }
      });
    }

    // Get all subfolders in source folder
    const sourceSubfolders = await prisma.folder.findMany({
      where: {
        parentId: sourceFolderId,
        userId: userId
      }
    });

    // Copy each subfolder recursively
    for (const sourceSubfolder of sourceSubfolders) {
      const uniqueName = await generateUniqueName(
        sourceSubfolder.name,
        userId,
        targetFolderId,
        'folder'
      );

      // Get target folder to build correct path
      const targetFolder = await prisma.folder.findUnique({
        where: { id: targetFolderId }
      });

      const newPath = targetFolder ? `${targetFolder.path}/${uniqueName}` : `/${uniqueName}`;

      // Create new subfolder
      const copiedSubfolder = await prisma.folder.create({
        data: {
          name: uniqueName,
          path: newPath,
          userId: userId,
          parentId: targetFolderId
        }
      });

      // Recursively copy contents of this subfolder
      await copyFolderContents(sourceSubfolder.id, copiedSubfolder.id, userId);
    }
  } catch (error) {
    console.error('Error copying folder contents:', error);
    throw error;
  }
}
