import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Get query string
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').trim().toLowerCase();
    // Get all folder paths of user
    const folders = await prisma.folder.findMany({
      where: { userId: user.id },
      select: { path: true },
      orderBy: { path: 'asc' },
    });
    // Filter paths that start with query (prefix match, case insensitive)
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
