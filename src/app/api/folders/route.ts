// GET: Return folder path list for autocomplete
export async function GET_AUTOCOMPLETE_PATH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Get all folder paths of user
    const folders = await prisma.folder.findMany({
      where: { userId: user.id },
      select: { path: true },
      orderBy: { path: 'asc' },
    });
    // Return path array
    const paths = folders.map((f: { path: string }) => f.path);
    return NextResponse.json({ paths });
  } catch (error) {
    console.error('Autocomplete path error:', error);
    return NextResponse.json({ error: 'Failed to fetch autocomplete paths' }, { status: 500 });
  }
}
// PATCH: Rename folder
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { id, name, path } = body;
    if (!id || (!name && !path)) {
      return NextResponse.json({ error: 'Missing id or new name/path' }, { status: 400 });
    }
    // Check ownership
    const folder = await prisma.folder.findFirst({ where: { id, userId: user.id } });
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    // Rename folder (keep original logic)
    if (name && !path) {
      const parentId = folder.parentId;
      const nameLower = name.trim().toLowerCase();
      // Check duplicate folder name
      const dupFolders = await prisma.folder.findMany({
        where: {
          userId: user.id,
          parentId: parentId,
          NOT: { id: folder.id },
        },
      });
      if (dupFolders.some((f: { name: string }) => f.name.trim().toLowerCase() === nameLower)) {
        return NextResponse.json({ error: 'thư mục cùng tên' }, { status: 400 });
      }
      // Check duplicate file name
      const dupFiles = await prisma.file.findMany({
        where: {
          userId: user.id,
          folderId: parentId,
        },
      });
      if (dupFiles.some((f: { name: string }) => f.name.trim().toLowerCase() === nameLower)) {
        return NextResponse.json({ error: 'tệp cùng tên' }, { status: 400 });
      }
      // Rename and update path for this folder and sub-folders
      const oldPath = folder.path;
      const newPath = oldPath.split('/').slice(0, -1).concat(name).join('/');
      await prisma.folder.update({ where: { id }, data: { name, path: newPath } });
      // Update path for sub-folders
      const subfolders = await prisma.folder.findMany({
        where: { userId: user.id, path: { startsWith: oldPath + '/' } },
      });
      for (const sub of subfolders) {
        const updatedPath = sub.path.replace(oldPath + '/', newPath + '/');
        await prisma.folder.update({ where: { id: sub.id }, data: { path: updatedPath } });
      }
      return NextResponse.json({ message: 'Rename successful' });
    }
    // Move folder (by path)
    if (path) {
      const targetPath = path.trim().replace(/\/+$/, '');
      if (!targetPath) {
        return NextResponse.json({ error: 'Invalid target path' }, { status: 400 });
      }
      // Don't allow moving into itself or its sub-folders
      if (targetPath === folder.path || targetPath.startsWith(folder.path + '/')) {
        return NextResponse.json({ error: 'Cannot move into itself or sub-folder' }, { status: 400 });
      }
      // Find target folder
      const destFolder = await prisma.folder.findFirst({ where: { userId: user.id, path: targetPath } });
      let newParentId: string | null = null;
      let newPath: string;
      if (destFolder) {
        newParentId = destFolder.id;
        newPath = destFolder.path + '/' + folder.name;
      } else if (targetPath === folder.name) {
        // Move to root, keep old name
        newParentId = null;
        newPath = folder.name;
      } else {
        // Target folder not found
        return NextResponse.json({ error: 'Target folder not found' }, { status: 400 });
      }
      // Check duplicate name in target folder
      const dupFolders = await prisma.folder.findMany({
        where: {
          userId: user.id,
          parentId: newParentId,
          NOT: { id: folder.id },
        },
      });
      if (dupFolders.some((f: { name: string }) => f.name.trim().toLowerCase() === folder.name.trim().toLowerCase())) {
        return NextResponse.json({ error: 'thư mục cùng tên' }, { status: 400 });
      }
      // Check duplicate file name in target folder
      const dupFiles = await prisma.file.findMany({
        where: {
          userId: user.id,
          folderId: newParentId,
        },
      });
      if (dupFiles.some((f: { name: string }) => f.name.trim().toLowerCase() === folder.name.trim().toLowerCase())) {
        return NextResponse.json({ error: 'tệp cùng tên' }, { status: 400 });
      }
      // Update parentId and path for this folder and sub-folders
      const oldPath = folder.path;
      await prisma.folder.update({ where: { id }, data: { parentId: newParentId, path: newPath } });
      // Update path for sub-folders
      const subfolders = await prisma.folder.findMany({ where: { userId: user.id, path: { startsWith: oldPath + '/' } } });
      for (const sub of subfolders) {
        const updatedPath = sub.path.replace(oldPath + '/', newPath + '/');
        await prisma.folder.update({ where: { id: sub.id }, data: { path: updatedPath } });
      }
      return NextResponse.json({ message: 'Move successful' });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Rename/Move folder error:', error);
    return NextResponse.json({ error: 'Rename/move failed' }, { status: 500 });
  }
}

// DELETE: Delete folder (and all sub-folders, files)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing folder id' }, { status: 400 });
    }
    // Check ownership
    const folder = await prisma.folder.findFirst({ where: { id, userId: user.id } });
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    // Delete all files in this folder and sub-folders
    const allFolders = await prisma.folder.findMany({ where: { userId: user.id, path: { startsWith: folder.path } }, select: { id: true } });
    const allFolderIds = allFolders.map((f: { id: string }) => f.id).concat([id]);
    await prisma.file.deleteMany({ where: { userId: user.id, folderId: { in: allFolderIds } } });
    // Delete sub-folders
    await prisma.folder.deleteMany({ where: { userId: user.id, path: { startsWith: folder.path + '/' } } });
    // Delete this folder itself
    await prisma.folder.delete({ where: { id } });
    return NextResponse.json({ message: 'Delete folder successful' });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ error: 'Delete folder failed' }, { status: 500 });
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
