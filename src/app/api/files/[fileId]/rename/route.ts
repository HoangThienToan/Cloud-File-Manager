import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/utils';

export async function PATCH(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Next.js App Router dynamic API: params is always an object here
    const fileId = params.fileId;
    const body = await request.json();
    const newName = (body.name || '').trim();
    const newPath = (body.path || '').trim();
    // Get current file
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.userId !== user.id) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    // Rename file
    if (newName && !newPath) {
      // Check duplicate name in same folder
      const dupFiles: { name: string }[] = await prisma.file.findMany({
        where: {
          userId: user.id,
          folderId: file.folderId,
          id: { not: fileId },
        },
      });
      const existsFile = dupFiles.some((f: { name: string }) => f.name.trim().toLowerCase() === newName.toLowerCase());
      const dupFolders: { name: string }[] = await prisma.folder.findMany({
        where: {
          userId: user.id,
          parentId: file.folderId,
        },
      });
      const existsFolder = dupFolders.some((f: { name: string }) => f.name.trim().toLowerCase() === newName.toLowerCase());
      if (existsFolder) {
        return NextResponse.json({ error: 'thư mục cùng tên' }, { status: 400 });
      }
      if (existsFile) {
        return NextResponse.json({ error: 'tệp cùng tên' }, { status: 400 });
      }
      await prisma.file.update({
        where: { id: fileId },
        data: { name: newName },
      });
      return NextResponse.json({ message: 'Rename successful' });
    }
    // Move file to another folder (by path)
    if (newPath) {
      // If path is empty then it's root folder
      let destFolderId: string | null = null;
      if (newPath !== '') {
        const destFolder = await prisma.folder.findFirst({ where: { userId: user.id, path: newPath } });
        if (!destFolder) {
          return NextResponse.json({ error: 'Target folder not found' }, { status: 400 });
        }
        destFolderId = destFolder.id;
      }
      // Check duplicate file name in target folder
      const dupFiles: { name: string }[] = await prisma.file.findMany({
        where: {
          userId: user.id,
          folderId: destFolderId,
          id: { not: fileId },
        },
      });
      const existsFile = dupFiles.some((f: { name: string }) => f.name.trim().toLowerCase() === file.name.trim().toLowerCase());
      // Check duplicate folder name in target folder
      const dupFolders: { name: string }[] = await prisma.folder.findMany({
        where: {
          userId: user.id,
          parentId: destFolderId,
        },
      });
      const existsFolder = dupFolders.some((f: { name: string }) => f.name.trim().toLowerCase() === file.name.trim().toLowerCase());
      if (existsFolder) {
        return NextResponse.json({ error: 'thư mục cùng tên' }, { status: 400 });
      }
      if (existsFile) {
        return NextResponse.json({ error: 'tệp cùng tên' }, { status: 400 });
      }
      await prisma.file.update({
        where: { id: fileId },
        data: { folderId: destFolderId },
      });
      return NextResponse.json({ message: 'Move successful' });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Rename file error:', error);
    return NextResponse.json({ error: 'Rename file failed' }, { status: 500 });
  }
}
