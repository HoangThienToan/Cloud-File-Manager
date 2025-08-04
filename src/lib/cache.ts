/**
 * Simple in-memory cache with TTL support
 * In production, consider using Redis or other distributed cache
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 5 * 60 * 1000) { // 5 minutes
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup(); // Clean before returning size
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get or set pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttlMs: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  // Destroy the cache and cleanup interval
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache duration constants
export const CACHE_DURATIONS = {
  VERY_SHORT: 30 * 1000,      // 30 seconds
  SHORT: 5 * 60 * 1000,       // 5 minutes
  MEDIUM: 30 * 60 * 1000,     // 30 minutes
  LONG: 2 * 60 * 60 * 1000,   // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Cache key helpers
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userFiles: (userId: string, folderId?: string) => 
    `files:${userId}:${folderId || 'root'}`,
  userFolders: (userId: string, parentId?: string) => 
    `folders:${userId}:${parentId || 'root'}`,
  fileMetadata: (fileId: string) => `file:${fileId}`,
  folderTree: (userId: string) => `tree:${userId}`,
  shareToken: (token: string) => `share:${token}`,
  userStats: (userId: string) => `stats:${userId}`,
} as const;

// Invalidation helpers
export const invalidateCache = {
  user: (userId: string) => {
    cache.delete(cacheKeys.user(userId));
    cache.delete(cacheKeys.userStats(userId));
    cache.delete(cacheKeys.folderTree(userId));
  },
  
  userFiles: (userId: string, folderId?: string) => {
    cache.delete(cacheKeys.userFiles(userId, folderId));
    cache.delete(cacheKeys.userStats(userId));
    cache.delete(cacheKeys.folderTree(userId));
  },
  
  userFolders: (userId: string, parentId?: string) => {
    cache.delete(cacheKeys.userFolders(userId, parentId));
    cache.delete(cacheKeys.folderTree(userId));
  },
  
  file: (fileId: string, userId: string, folderId?: string) => {
    cache.delete(cacheKeys.fileMetadata(fileId));
    invalidateCache.userFiles(userId, folderId);
  },
  
  share: (token: string) => {
    cache.delete(cacheKeys.shareToken(token));
  },
  
  all: (userId: string) => {
    // Clear all user-related cache entries
    const keysToDelete: string[] = [];
    
    // This is not efficient for large caches, but works for in-memory cache
    for (const key of ['user', 'files', 'folders', 'tree', 'stats'].map(prefix => `${prefix}:${userId}`)) {
      keysToDelete.push(key);
    }
    
    keysToDelete.forEach(key => cache.delete(key));
  },
} as const;

// Decorator for caching function results
export function cached<T extends any[], R>(
  keyFactory: (...args: T) => string,
  ttlMs: number
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: T): Promise<R> {
      const key = keyFactory(...args);
      
      const cached = cache.get<R>(key);
      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttlMs);
      return result;
    };

    return descriptor;
  };
}
