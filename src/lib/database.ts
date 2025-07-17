import { blink } from '@/blink/client'

export interface FileRecord {
  id: string
  userId: string
  fileName: string
  fileSize: number
  fileType: string
  storagePath: string
  publicUrl: string
  uploadedAt: string
  createdAt?: string
  updatedAt?: string
}

export interface FileAccessLog {
  id: string
  fileId: string
  userId: string
  action: 'upload' | 'download' | 'view' | 'delete'
  accessedAt: string
  ipAddress?: string
  userAgent?: string
}

export interface UserStorageQuota {
  userId: string
  quotaBytes: number
  usedBytes: number
  createdAt?: string
  updatedAt?: string
}

export class DatabaseService {
  // File operations
  static async createFile(fileData: Omit<FileRecord, 'createdAt' | 'updatedAt'>) {
    return await blink.db.files.create({
      ...fileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  static async getUserFiles(userId: string, options?: {
    limit?: number
    orderBy?: 'uploadedAt' | 'fileName' | 'fileSize'
    order?: 'asc' | 'desc'
    search?: string
  }) {
    const { limit = 100, orderBy = 'uploadedAt', order = 'desc', search } = options || {}
    
    let whereClause: any = { userId }
    
    if (search) {
      // Note: This is a simplified search - in production you might want full-text search
      whereClause = {
        AND: [
          { userId },
          { fileName: { contains: search } }
        ]
      }
    }

    return await blink.db.files.list({
      where: whereClause,
      orderBy: { [orderBy]: order },
      limit
    })
  }

  static async getFileById(fileId: string) {
    return await blink.db.files.list({
      where: { id: fileId },
      limit: 1
    }).then(files => files[0] || null)
  }

  static async deleteFile(fileId: string) {
    return await blink.db.files.delete(fileId)
  }

  static async getUserStorageUsage(userId: string) {
    const files = await blink.db.files.list({
      where: { userId }
    })
    
    return files.reduce((total, file) => total + file.fileSize, 0)
  }

  // Access log operations
  static async logFileAccess(logData: Omit<FileAccessLog, 'accessedAt'>) {
    return await blink.db.fileAccessLogs.create({
      ...logData,
      accessedAt: new Date().toISOString()
    })
  }

  static async getUserAccessLogs(userId: string, options?: {
    limit?: number
    fileId?: string
    action?: string
  }) {
    const { limit = 50, fileId, action } = options || {}
    
    let whereClause: any = { userId }
    
    if (fileId) {
      whereClause.fileId = fileId
    }
    
    if (action) {
      whereClause.action = action
    }

    return await blink.db.fileAccessLogs.list({
      where: whereClause,
      orderBy: { accessedAt: 'desc' },
      limit
    })
  }

  static async getFileAccessStats(userId: string) {
    const logs = await blink.db.fileAccessLogs.list({
      where: { userId }
    })

    const stats = {
      totalActions: logs.length,
      uploads: logs.filter(log => log.action === 'upload').length,
      downloads: logs.filter(log => log.action === 'download').length,
      views: logs.filter(log => log.action === 'view').length,
      deletes: logs.filter(log => log.action === 'delete').length
    }

    return stats
  }

  // Storage quota operations
  static async getUserStorageQuota(userId: string) {
    const quotas = await blink.db.userStorageQuotas.list({
      where: { userId },
      limit: 1
    })
    
    if (quotas.length === 0) {
      // Create default quota if none exists
      return await blink.db.userStorageQuotas.create({
        userId,
        quotaBytes: 1073741824, // 1GB default
        usedBytes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
    
    return quotas[0]
  }

  static async updateStorageUsage(userId: string, usedBytes: number) {
    const quota = await this.getUserStorageQuota(userId)
    
    return await blink.db.userStorageQuotas.update(quota.userId, {
      usedBytes,
      updatedAt: new Date().toISOString()
    })
  }

  // Utility functions
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  static isWithinQuota(usedBytes: number, quotaBytes: number, newFileSize: number): boolean {
    return (usedBytes + newFileSize) <= quotaBytes
  }

  static getFileTypeCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('pdf')) return 'document'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation'
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'archive'
    return 'other'
  }
}

// Export commonly used functions
export const {
  createFile,
  getUserFiles,
  getFileById,
  deleteFile,
  getUserStorageUsage,
  logFileAccess,
  getUserAccessLogs,
  getFileAccessStats,
  getUserStorageQuota,
  updateStorageUsage,
  formatFileSize,
  isWithinQuota,
  getFileTypeCategory
} = DatabaseService