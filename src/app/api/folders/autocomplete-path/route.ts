import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Lấy query string
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').trim().toLowerCase();
    // Lấy tất cả path thư mục của user
    const folders = await prisma.folder.findMany({
      where: { userId: user.id },
      select: { path: true },
      orderBy: { path: 'asc' },
    });
    // Lọc các path bắt đầu bằng query (prefix match, không phân biệt hoa thường)
    let paths = folders.map((f: { path: string }) => f.path);
    if (query) {
      paths = paths.filter((p: string) => p.toLowerCase().startsWith(query));
    }
    return NextResponse.json({ paths });
  } catch (error) {
    console.error('Autocomplete path error:', error);
    return NextResponse.json({ error: 'Failed to fetch autocomplete paths' }, { status: 500 });
  }
}
