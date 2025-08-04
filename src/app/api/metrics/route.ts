import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jobQueue } from '@/lib/background-jobs';
import { cache } from '@/lib/cache';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {} as any,
      backgroundJobs: jobQueue.getStats(),
      cache: {
        size: cache.size()
      },
      application: {} as any,
      logs: {
        recent: logger.getRecentLogs(10).length,
        total: logger.getRecentLogs(1000).length
      }
    };

    // Database metrics
    try {
      const [userCount, fileCount, folderCount, shareCount] = await Promise.all([
        prisma.user.count(),
        prisma.file.count(),
        prisma.folder.count(),
        prisma.share.count()
      ]);

      const fileSizeStats = await prisma.file.aggregate({
        _sum: { size: true },
        _avg: { size: true },
        _max: { size: true }
      });

      metrics.database = {
        users: userCount,
        files: fileCount,
        folders: folderCount,
        shares: shareCount,
        totalFileSize: fileSizeStats._sum.size || 0,
        averageFileSize: Math.round(fileSizeStats._avg.size || 0),
        largestFile: fileSizeStats._max.size || 0
      };

      // Recent activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentFiles, recentUsers, recentShares] = await Promise.all([
        prisma.file.count({ where: { createdAt: { gte: yesterday } } }),
        prisma.user.count({ where: { createdAt: { gte: yesterday } } }),
        prisma.share.count({ where: { createdAt: { gte: yesterday } } })
      ]);

      metrics.application = {
        recentActivity: {
          newFiles: recentFiles,
          newUsers: recentUsers,
          newShares: recentShares
        },
        storage: {
          totalSizeBytes: fileSizeStats._sum.size || 0,
          totalSizeMB: Math.round((fileSizeStats._sum.size || 0) / 1024 / 1024),
          totalSizeGB: Math.round((fileSizeStats._sum.size || 0) / 1024 / 1024 / 1024 * 100) / 100
        }
      };

    } catch (error) {
      metrics.database = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json(metrics);

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
