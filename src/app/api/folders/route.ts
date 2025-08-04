// GET: Trả về danh sách path thư mục cho autocomplete
export async function GET_AUTOCOMPLETE_PATH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Lấy tất cả path thư mục của user
    const folders = await prisma.folder.findMany({
      where: { userId: user.id },
      select: { path: true },
      orderBy: { path: 'asc' },
    });
    // Trả về mảng path
    const paths = folders.map((f: { path: string }) => f.path);
    return NextResponse.json({ paths });
  } catch (error) {
    console.error('Autocomplete path error:', error);
    return NextResponse.json({ error: 'Failed to fetch autocomplete paths' }, { status: 500 });
  }
}
// PATCH: Đổi tên thư mục
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { id, name, path } = body;
    if (!id || (!name && !path)) {
      return NextResponse.json({ error: 'Thiếu id hoặc tên/path mới' }, { status: 400 });
    }
    // Kiểm tra quyền sở hữu
    const folder = await prisma.folder.findFirst({ where: { id, userId: user.id } });
    if (!folder) {
      return NextResponse.json({ error: 'Thư mục không tồn tại' }, { status: 404 });
    }
    // Đổi tên thư mục (giữ nguyên logic cũ)
    if (name && !path) {
      const parentId = folder.parentId;
      const nameLower = name.trim().toLowerCase();
      // Kiểm tra trùng tên thư mục
      const dupFolders = await prisma.folder.findMany({
        where: {
          userId: user.id,
          parentId: parentId,
          NOT: { id: folder.id },
        },
      });
      if (dupFolders.some((f: { name: string }) => f.name.trim().toLowerCase() === nameLower)) {
        return NextResponse.json({ error: 'Đã có thư mục cùng tên trong thư mục này!' }, { status: 400 });
      }
      // Kiểm tra trùng tên tệp
      const dupFiles = await prisma.file.findMany({
        where: {
          userId: user.id,
          folderId: parentId,
        },
      });
      if (dupFiles.some((f: { name: string }) => f.name.trim().toLowerCase() === nameLower)) {
        return NextResponse.json({ error: 'Đã có tệp cùng tên trong thư mục này!' }, { status: 400 });
      }
      // Đổi tên và cập nhật path cho thư mục này và các thư mục con
      const oldPath = folder.path;
      const newPath = oldPath.split('/').slice(0, -1).concat(name).join('/');
      await prisma.folder.update({ where: { id }, data: { name, path: newPath } });
      // Cập nhật path cho các thư mục con
      const subfolders = await prisma.folder.findMany({
        where: { userId: user.id, path: { startsWith: oldPath + '/' } },
      });
      for (const sub of subfolders) {
        const updatedPath = sub.path.replace(oldPath + '/', newPath + '/');
        await prisma.folder.update({ where: { id: sub.id }, data: { path: updatedPath } });
      }
      return NextResponse.json({ message: 'Đổi tên thành công' });
    }
    // Di chuyển thư mục (theo path)
    if (path) {
      const targetPath = path.trim().replace(/\/+$/, '');
      if (!targetPath) {
        return NextResponse.json({ error: 'Đường dẫn đích không hợp lệ' }, { status: 400 });
      }
      // Không cho di chuyển vào chính nó hoặc thư mục con của nó
      if (targetPath === folder.path || targetPath.startsWith(folder.path + '/')) {
        return NextResponse.json({ error: 'Không thể di chuyển vào chính nó hoặc thư mục con' }, { status: 400 });
      }
      // Tìm thư mục đích
      const destFolder = await prisma.folder.findFirst({ where: { userId: user.id, path: targetPath } });
      let newParentId: string | null = null;
      let newPath: string;
      if (destFolder) {
        newParentId = destFolder.id;
        newPath = destFolder.path + '/' + folder.name;
      } else if (targetPath === folder.name) {
        // Di chuyển về gốc, giữ tên cũ
        newParentId = null;
        newPath = folder.name;
      } else {
        // Không tìm thấy thư mục đích
        return NextResponse.json({ error: 'Thư mục đích không tồn tại' }, { status: 400 });
      }
      // Kiểm tra trùng tên trong thư mục đích
      const dupFolders = await prisma.folder.findMany({
        where: {
          userId: user.id,
          parentId: newParentId,
          NOT: { id: folder.id },
        },
      });
      if (dupFolders.some((f: { name: string }) => f.name.trim().toLowerCase() === folder.name.trim().toLowerCase())) {
        return NextResponse.json({ error: 'Đã có thư mục cùng tên trong thư mục đích!' }, { status: 400 });
      }
      // Kiểm tra trùng tên tệp trong thư mục đích
      const dupFiles = await prisma.file.findMany({
        where: {
          userId: user.id,
          folderId: newParentId,
        },
      });
      if (dupFiles.some((f: { name: string }) => f.name.trim().toLowerCase() === folder.name.trim().toLowerCase())) {
        return NextResponse.json({ error: 'Đã có tệp cùng tên trong thư mục đích!' }, { status: 400 });
      }
      // Cập nhật parentId và path cho thư mục này và các thư mục con
      const oldPath = folder.path;
      await prisma.folder.update({ where: { id }, data: { parentId: newParentId, path: newPath } });
      // Cập nhật path cho các thư mục con
      const subfolders = await prisma.folder.findMany({ where: { userId: user.id, path: { startsWith: oldPath + '/' } } });
      for (const sub of subfolders) {
        const updatedPath = sub.path.replace(oldPath + '/', newPath + '/');
        await prisma.folder.update({ where: { id: sub.id }, data: { path: updatedPath } });
      }
      return NextResponse.json({ message: 'Di chuyển thành công' });
    }
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Rename/Move folder error:', error);
    return NextResponse.json({ error: 'Đổi tên/di chuyển thất bại' }, { status: 500 });
  }
}

// DELETE: Xóa thư mục (và toàn bộ thư mục con, file con)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Thiếu id thư mục' }, { status: 400 });
    }
    // Kiểm tra quyền sở hữu
    const folder = await prisma.folder.findFirst({ where: { id, userId: user.id } });
    if (!folder) {
      return NextResponse.json({ error: 'Thư mục không tồn tại' }, { status: 404 });
    }
    // Xóa tất cả file trong thư mục này và các thư mục con
    const allFolders = await prisma.folder.findMany({ where: { userId: user.id, path: { startsWith: folder.path } }, select: { id: true } });
    const allFolderIds = allFolders.map((f: { id: string }) => f.id).concat([id]);
    await prisma.file.deleteMany({ where: { userId: user.id, folderId: { in: allFolderIds } } });
    // Xóa các thư mục con
    await prisma.folder.deleteMany({ where: { userId: user.id, path: { startsWith: folder.path + '/' } } });
    // Xóa chính thư mục này
    await prisma.folder.delete({ where: { id } });
    return NextResponse.json({ message: 'Xóa thư mục thành công' });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ error: 'Xóa thư mục thất bại' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { name, parentId } = createFolderSchema.parse(body)
    let path = name;
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId: user.id }
      })
      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
      }
      path = parentFolder.path + '/' + name;
    }
    // Kiểm tra trùng tên thư mục và tệp (không phân biệt hoa thường)
    const nameLower = name.trim().toLowerCase();
    // Kiểm tra trùng tên thư mục
    const dupFolders = await prisma.folder.findMany({
      where: {
        userId: user.id,
        parentId: parentId || null,
      },
    });
    if (dupFolders.some((f: { name: string }) => f.name.trim().toLowerCase() === nameLower)) {
      return NextResponse.json({ error: 'Đã có thư mục cùng tên trong thư mục này!' }, { status: 400 });
    }
    // Kiểm tra trùng tên tệp
    const dupFiles = await prisma.file.findMany({
      where: {
        userId: user.id,
        folderId: parentId || null,
      },
    });
    if (dupFiles.some((f: { name: string }) => f.name.trim().toLowerCase() === nameLower)) {
      return NextResponse.json({ error: 'Đã có tệp cùng tên trong thư mục này!' }, { status: 400 });
    }
    const folder = await prisma.folder.create({
      data: { name, userId: user.id, parentId: parentId || null, path }
    })
    return NextResponse.json({
      message: 'Folder created successfully',
      folder: { id: folder.id, name: folder.name, parentId: folder.parentId, createdAt: folder.createdAt }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Create folder error:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}


// Đệ quy lấy cây thư mục và file đồng cấp
async function getFolderTree(userId: string, parentId: string | null = null) {
  // Lấy path của thư mục cha hiện tại (nếu có)
  let parentPath: string | undefined = undefined;
  if (parentId) {
    const parentFolder = await prisma.folder.findUnique({ where: { id: parentId }, select: { path: true } });
    if (parentFolder && parentFolder.path) parentPath = parentFolder.path;
  }
  // Debug: log filesWithPath để kiểm tra giá trị file trả về
  // eslint-disable-next-line no-console
  // Lấy thư mục con và file đồng cấp trong path đó
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { userId, parentId: parentId || null },
      select: { id: true, name: true, parentId: true, createdAt: true, updatedAt: true, path: true }
    }),
    prisma.file.findMany({
      where: { userId, folderId: parentId || null },
      select: { id: true, name: true, size: true, mimeType: true, createdAt: true, updatedAt: true, storageName: true, folderId: true },
    })
  ]);
  // Luôn gán path cho file: nếu có parentPath thì dùng, nếu không thì path rỗng (root)
  const filesWithPath = files.map((f: any) => ({ ...f, parentPath: parentPath ?? '' }));
  // Đệ quy cho từng thư mục con

  const tree = await Promise.all(folders.map(async (folder: {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    parentPath: string;
  }) => ({
    ...folder,
    children: (await getFolderTree(userId, folder.id)).folders
  })));
  // Trả về tree và files đồng cấp (files đã có parentPath)
  return { folders: tree, files: filesWithPath };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Lấy parentId từ query
    const { searchParams } = new URL(request.url);
    let parentId = searchParams.get('parentId');
    // Xử lý parentId rỗng hoặc 'null' thành null thực sự
    if (!parentId || parentId === 'null') parentId = null;
    // console.log('API /api/folders parentId:', parentId);
    const tree = await getFolderTree(user.id, parentId);
    if (parentId === null) {
      // Trả về cho sidebar và bảng chính ở thư mục gốc
      const response = { folders: tree.folders, files: tree.files, folderTree: tree.folders };
    //   console.log('API /api/folders response (root):', JSON.stringify(response, null, 2));
      return NextResponse.json(response);
    } else {
      // Trả về cho bảng chính: { folders, files }
    //   console.log('API /api/folders response (table):', JSON.stringify({ folders: tree.folders, files: tree.files }, null, 2));
      return NextResponse.json({ folders: tree.folders, files: tree.files });
    }
  } catch (error) {
    console.error('List folders error:', error)
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
  }
}
