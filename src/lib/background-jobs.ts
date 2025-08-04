/**
 * Background Job Processing System
 * Handles file processing, cleanup, and maintenance tasks
 */

export enum JobType {
  FILE_CLEANUP = 'file_cleanup',
  THUMBNAIL_GENERATION = 'thumbnail_generation',
  FILE_COMPRESSION = 'file_compression',
  EXPIRED_SHARES_CLEANUP = 'expired_shares_cleanup',
  USER_STORAGE_CALCULATION = 'user_storage_calculation',
  ORPHANED_FILES_CLEANUP = 'orphaned_files_cleanup',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface JobData {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: Record<string, unknown>;
}

export interface JobProcessor {
  process: (payload: Record<string, unknown>) => Promise<Record<string, unknown> | void>;
  maxAttempts?: number;
  retryDelay?: number;
}

class BackgroundJobQueue {
  private jobs = new Map<string, JobData>();
  private processors = new Map<JobType, JobProcessor>();
  private processing = new Set<string>();
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private pollInterval: number = 5000) {}

  // Register a job processor
  register(type: JobType, processor: JobProcessor): void {
    this.processors.set(type, processor);
  }

  // Add a job to the queue
  async addJob(
    type: JobType, 
    payload: Record<string, unknown> = {}, 
    options: { maxAttempts?: number; delay?: number } = {}
  ): Promise<string> {
    const jobId = crypto.randomUUID();
    const job: JobData = {
      id: jobId,
      type,
      status: JobStatus.PENDING,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    
    // If delay is specified, schedule the job
    if (options.delay) {
      setTimeout(() => {
        const delayedJob = this.jobs.get(jobId);
        if (delayedJob && delayedJob.status === JobStatus.PENDING) {
          this.processJob(jobId);
        }
      }, options.delay);
      return jobId;
    }

    // Process immediately if queue is running
    if (this.isRunning) {
      this.processJob(jobId);
    }

    return jobId;
  }

  // Get job status
  getJob(jobId: string): JobData | undefined {
    return this.jobs.get(jobId);
  }

  // Get jobs by status
  getJobsByStatus(status: JobStatus): JobData[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  // Get jobs by type
  getJobsByType(type: JobType): JobData[] {
    return Array.from(this.jobs.values()).filter(job => job.type === type);
  }

  // Start the job queue processor
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.interval = setInterval(() => {
      this.processPendingJobs();
    }, this.pollInterval);
  }

  // Stop the job queue processor
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  // Process all pending jobs
  private async processPendingJobs(): Promise<void> {
    const pendingJobs = this.getJobsByStatus(JobStatus.PENDING);
    
    for (const job of pendingJobs) {
      if (!this.processing.has(job.id)) {
        this.processJob(job.id);
      }
    }
  }

  // Process a specific job
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || this.processing.has(jobId)) return;

    const processor = this.processors.get(job.type);
    if (!processor) return;

    this.processing.add(jobId);
    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();
    job.attempts++;

    try {
      const result = await processor.process(job.payload);
      
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      job.result = result || {};
      
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      
      if (job.attempts >= job.maxAttempts) {
        job.status = JobStatus.FAILED;
        job.completedAt = new Date();
      } else {
        job.status = JobStatus.PENDING;
        // Exponential backoff retry
        const retryDelay = (processor.retryDelay || 1000) * Math.pow(2, job.attempts - 1);
        setTimeout(() => {
          if (job.status === JobStatus.PENDING) {
            this.processJob(jobId);
          }
        }, retryDelay);
      }
    } finally {
      this.processing.delete(jobId);
    }
  }

  // Clean up completed/failed jobs older than specified age
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) &&
        job.completedAt &&
        job.completedAt < cutoff
      ) {
        this.jobs.delete(jobId);
      }
    }
  }

  // Get queue statistics
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === JobStatus.PENDING).length,
      processing: jobs.filter(j => j.status === JobStatus.PROCESSING).length,
      completed: jobs.filter(j => j.status === JobStatus.COMPLETED).length,
      failed: jobs.filter(j => j.status === JobStatus.FAILED).length,
    };
  }
}

// Global job queue instance
export const jobQueue = new BackgroundJobQueue();

// Job processors
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

// File cleanup processor
jobQueue.register(JobType.FILE_CLEANUP, {
  maxAttempts: 2,
  process: async (payload) => {
    const { filePath, fileId } = payload as { filePath: string; fileId: string };
    
    try {
      await fs.unlink(filePath);
      logger.info('File cleaned up successfully', { 
        action: 'job.file_cleanup', 
        fileId, 
        filePath 
      });
      return { success: true, filePath };
    } catch (error) {
      logger.error('Failed to cleanup file', { 
        action: 'job.file_cleanup', 
        fileId, 
        filePath, 
        error 
      });
      throw error;
    }
  }
});

// Expired shares cleanup processor
jobQueue.register(JobType.EXPIRED_SHARES_CLEANUP, {
  maxAttempts: 2,
  process: async () => {
    try {
      const expiredShares = await prisma.share.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      logger.info('Expired shares cleaned up', { 
        action: 'job.expired_shares_cleanup', 
        count: expiredShares.count 
      });
      
      return { deletedCount: expiredShares.count };
    } catch (error) {
      logger.error('Failed to cleanup expired shares', { 
        action: 'job.expired_shares_cleanup', 
        error 
      });
      throw error;
    }
  }
});

// User storage calculation processor
jobQueue.register(JobType.USER_STORAGE_CALCULATION, {
  maxAttempts: 2,
  process: async (payload) => {
    const { userId } = payload as { userId: string };
    
    try {
      const result = await prisma.file.aggregate({
        where: { userId },
        _sum: { size: true },
        _count: true
      });

      const totalSize = result._sum.size || 0;
      const fileCount = result._count;

      logger.info('User storage calculated', { 
        action: 'job.user_storage_calculation', 
        userId, 
        totalSize, 
        fileCount 
      });
      
      return { userId, totalSize, fileCount };
    } catch (error) {
      logger.error('Failed to calculate user storage', { 
        action: 'job.user_storage_calculation', 
        userId, 
        error 
      });
      throw error;
    }
  }
});

// Orphaned files cleanup processor
jobQueue.register(JobType.ORPHANED_FILES_CLEANUP, {
  maxAttempts: 2,
  process: async () => {
    try {
      // Find files in database that don't exist on disk
      const files = await prisma.file.findMany({
        select: { id: true, path: true, storageName: true, userId: true }
      });

      let cleanedCount = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          await fs.access(file.path);
        } catch {
          // File doesn't exist on disk, remove from database
          await prisma.file.delete({ where: { id: file.id } });
          cleanedCount++;
          
          logger.info('Orphaned file record removed', { 
            action: 'job.orphaned_cleanup', 
            fileId: file.id, 
            path: file.path 
          });
        }
      }

      logger.info('Orphaned files cleanup completed', { 
        action: 'job.orphaned_files_cleanup', 
        cleanedCount, 
        totalChecked: files.length 
      });
      
      return { cleanedCount, totalChecked: files.length, errors };
    } catch (error) {
      logger.error('Failed to cleanup orphaned files', { 
        action: 'job.orphaned_files_cleanup', 
        error 
      });
      throw error;
    }
  }
});

// Start the job queue
jobQueue.start();

// Schedule periodic cleanup jobs
setInterval(() => {
  jobQueue.addJob(JobType.EXPIRED_SHARES_CLEANUP);
}, 60 * 60 * 1000); // Every hour

setInterval(() => {
  jobQueue.addJob(JobType.ORPHANED_FILES_CLEANUP);
}, 24 * 60 * 60 * 1000); // Every 24 hours

// Clean up old job records
setInterval(() => {
  jobQueue.cleanup();
}, 60 * 60 * 1000); // Every hour

// Helper functions for job management
export const jobs = {
  // Schedule file cleanup
  scheduleFileCleanup: (filePath: string, fileId: string, delay = 0) => {
    return jobQueue.addJob(JobType.FILE_CLEANUP, { filePath, fileId }, { delay });
  },

  // Calculate user storage
  calculateUserStorage: (userId: string) => {
    return jobQueue.addJob(JobType.USER_STORAGE_CALCULATION, { userId });
  },

  // Get job status
  getStatus: (jobId: string) => {
    return jobQueue.getJob(jobId);
  },

  // Get queue statistics
  getQueueStats: () => {
    return jobQueue.getStats();
  },

  // Manual cleanup operations
  cleanupExpiredShares: () => {
    return jobQueue.addJob(JobType.EXPIRED_SHARES_CLEANUP);
  },

  cleanupOrphanedFiles: () => {
    return jobQueue.addJob(JobType.ORPHANED_FILES_CLEANUP);
  }
};
