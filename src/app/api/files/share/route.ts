import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, expiresIn = 24 * 60 * 60 * 1000 } = await request.json(); // Default 24 hours

    // Verify file exists and user owns it
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: user.id,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Create share token
    const shareToken = uuidv4();
    const expiresAt = new Date(Date.now() + expiresIn);

    // Store share info in database (you might want to create a shares table)
    // For now, we'll use a simple approach
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/files/share/${shareToken}`;

    // In a real app, you'd store the share token in a database
    // For demo purposes, we'll just return the URL
    
    return NextResponse.json({
      shareUrl,
      expiresAt,
    });
  } catch (error) {
    console.error('Create share link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
