import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jobQueue } from '@/lib/background-jobs';
import { cache } from '@/lib/cache';

export async function GET() {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {} as Record<string, any>
  };

  try {
    // Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
      health.status = 'unhealthy';
    }

    // Background jobs check
    try {
      const jobStats = jobQueue.getStats();
      health.checks.backgroundJobs = {
        status: 'healthy',
        stats: jobStats
      };
      
      // Mark as degraded if too many failed jobs
      if (jobStats.failed > jobStats.completed * 0.1) {
        health.checks.backgroundJobs.status = 'degraded';
        health.status = health.status === 'healthy' ? 'degraded' : health.status;
      }
    } catch (error) {
      health.checks.backgroundJobs = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      health.status = 'unhealthy';
    }

    // Cache system check
    try {
      const testKey = 'health_check_' + Date.now();
      cache.set(testKey, 'test', 1000);
      const testValue = cache.get(testKey);
      cache.delete(testKey);
      
      health.checks.cache = {
        status: testValue === 'test' ? 'healthy' : 'unhealthy',
        size: cache.size()
      };
      
      if (testValue !== 'test') {
        health.status = 'unhealthy';
      }
    } catch (error) {
      health.checks.cache = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      health.status = 'unhealthy';
    }

    // Memory usage check
    const memUsage = process.memoryUsage();
    health.checks.memory = {
      status: 'healthy',
      usage: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      }
    };

    // Disk space check (simplified)
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(process.cwd());
      health.checks.diskSpace = {
        status: 'healthy',
        accessible: true
      };
    } catch (error) {
      health.checks.diskSpace = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      health.status = 'unhealthy';
    }

    health.checks.responseTime = Date.now() - startTime;

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }, { status: 503 });
  }
}
