import { z } from 'zod'

// Common validation schemas
export const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const parsed = parseInt(val)
    return isNaN(parsed) || parsed < 1 ? 1 : parsed
  }),
  limit: z.string().optional().default('20').transform(val => {
    const parsed = parseInt(val)
    return isNaN(parsed) || parsed < 1 ? 20 : Math.min(parsed, 100)
  })
})

export const fileQuerySchema = z.object({
  folderId: z.string().nullable().optional(),
  search: z.string().optional(),
  mimeType: z.string().optional(),
  sortBy: z.enum(['name', 'size', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
}).merge(paginationSchema)

export const folderQuerySchema = z.object({
  parentId: z.string().nullable().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
}).merge(paginationSchema)

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase, one uppercase, and one number'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name is too long')
})

// File schemas
export const fileUploadSchema = z.object({
  folderId: z.string().nullable().optional(),
  replace: z.boolean().optional().default(false)
})

export const fileRenameSchema = z.object({
  name: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name is too long')
    .refine(name => !name.includes('..'), 'File name cannot contain ".."')
    .refine(name => !/[<>:"/\\|?*]/.test(name), 'File name contains invalid characters'),
  path: z.string().optional()
})

export const fileMoveSchema = z.object({
  folderId: z.string().nullable()
})

// Folder schemas
export const folderCreateSchema = z.object({
  name: z.string()
    .min(1, 'Folder name is required')
    .max(255, 'Folder name is too long')
    .refine(name => !name.includes('..'), 'Folder name cannot contain ".."')
    .refine(name => !/[<>:"/\\|?*]/.test(name), 'Folder name contains invalid characters'),
  parentId: z.string().nullable().optional()
})

export const folderUpdateSchema = z.object({
  id: z.string().min(1, 'Folder ID is required'),
  name: z.string()
    .min(1, 'Folder name is required')
    .max(255, 'Folder name is too long')
    .refine(name => !name.includes('..'), 'Folder name cannot contain ".."')
    .refine(name => !/[<>:"/\\|?*]/.test(name), 'Folder name contains invalid characters')
    .optional(),
  path: z.string().optional()
})

// Bulk operation schemas
export const bulkOperationSchema = z.object({
  action: z.enum(['delete', 'move', 'copy', 'compress']),
  itemIds: z.array(z.string()).min(1, 'At least one item must be selected'),
  itemTypes: z.array(z.enum(['file', 'folder'])).optional(),
  targetFolderId: z.string().nullable().optional(),
  archiveName: z.string().optional()
})

// Share schemas
export const shareCreateSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
  expiresAt: z.string().datetime().optional(),
  password: z.string().optional(),
  allowDownload: z.boolean().optional().default(true)
})

// Validation helper functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateFileName(fileName: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!fileName || fileName.trim().length === 0) {
    errors.push('File name is required')
  }
  
  if (fileName.length > 255) {
    errors.push('File name is too long')
  }
  
  if (fileName.includes('..')) {
    errors.push('File name cannot contain ".."')
  }
  
  if (/[<>:"/\\|?*]/.test(fileName)) {
    errors.push('File name contains invalid characters')
  }
  
  // Check for reserved names on Windows
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  const nameWithoutExt = fileName.split('.')[0].toUpperCase()
  if (reservedNames.includes(nameWithoutExt)) {
    errors.push('File name uses a reserved system name')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100) // Limit length
}

export function validateFileSize(size: number, maxSize: number = 50 * 1024 * 1024): { isValid: boolean; error?: string } {
  if (size <= 0) {
    return { isValid: false, error: 'File size must be greater than 0' }
  }
  
  if (size > maxSize) {
    return { isValid: false, error: `File size exceeds maximum allowed size of ${formatFileSize(maxSize)}` }
  }
  
  return { isValid: true }
}

export function validateMimeType(mimeType: string, allowedTypes?: string[]): { isValid: boolean; error?: string } {
  const defaultAllowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]
  
  const allowed = allowedTypes || defaultAllowedTypes
  
  if (!allowed.includes(mimeType)) {
    return { isValid: false, error: 'File type not allowed' }
  }
  
  return { isValid: true }
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}
