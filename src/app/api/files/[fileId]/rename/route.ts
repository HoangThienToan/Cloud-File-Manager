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
    // Lấy file hiện tại
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.userId !== user.id) {
      return NextResponse.json({ error: 'Không tìm thấy tệp' }, { status: 404 });
    }
    // Đổi tên file
    if (newName && !newPath) {
      // Kiểm tra trùng tên trong cùng folder
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
        return NextResponse.json({ error: 'Đã có thư mục cùng tên trong thư mục này!' }, { status: 400 });
      }
      if (existsFile) {
        return NextResponse.json({ error: 'Đã có tệp cùng tên trong thư mục này!' }, { status: 400 });
      }
      await prisma.file.update({
        where: { id: fileId },
        data: { name: newName },
      });
      return NextResponse.json({ message: 'Đổi tên thành công' });
    }
    // Di chuyển file sang thư mục khác (theo path)
    if (newPath) {
      // Nếu path rỗng thì là thư mục gốc
      let destFolderId: string | null = null;
      if (newPath !== '') {
        const destFolder = await prisma.folder.findFirst({ where: { userId: user.id, path: newPath } });
        if (!destFolder) {
          return NextResponse.json({ error: 'Thư mục đích không tồn tại' }, { status: 400 });
        }
        destFolderId = destFolder.id;
      }
      // Kiểm tra trùng tên file trong thư mục đích
      const dupFiles: { name: string }[] = await prisma.file.findMany({
        where: {
          userId: user.id,
          folderId: destFolderId,
          id: { not: fileId },
        },
      });
      const existsFile = dupFiles.some((f: { name: string }) => f.name.trim().toLowerCase() === file.name.trim().toLowerCase());
      // Kiểm tra trùng tên thư mục trong thư mục đích
      const dupFolders: { name: string }[] = await prisma.folder.findMany({
        where: {
          userId: user.id,
          parentId: destFolderId,
        },
      });
      const existsFolder = dupFolders.some((f: { name: string }) => f.name.trim().toLowerCase() === file.name.trim().toLowerCase());
      if (existsFolder) {
        return NextResponse.json({ error: 'Đã có thư mục cùng tên trong thư mục đích!' }, { status: 400 });
      }
      if (existsFile) {
        return NextResponse.json({ error: 'Đã có tệp cùng tên trong thư mục đích!' }, { status: 400 });
      }
      await prisma.file.update({
        where: { id: fileId },
        data: { folderId: destFolderId },
      });
      return NextResponse.json({ message: 'Di chuyển thành công' });
    }
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Rename file error:', error);
    return NextResponse.json({ error: 'Đổi tên tệp thất bại' }, { status: 500 });
  }
}
