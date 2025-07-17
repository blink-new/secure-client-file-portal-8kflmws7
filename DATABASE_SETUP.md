# Database Setup for Secure Client File Upload Portal

This document explains how to set up and use the database for managing client file uploads.

## Database Schema

The application uses three main tables:

### 1. Files Table (`files`)
Stores metadata about uploaded files:
- `id` - Unique file identifier
- `user_id` - ID of the user who uploaded the file
- `file_name` - Original filename
- `file_size` - File size in bytes
- `file_type` - MIME type of the file
- `storage_path` - Path in the storage system
- `public_url` - Public URL to access the file
- `uploaded_at` - When the file was uploaded
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

### 2. File Access Logs Table (`file_access_logs`)
Tracks all file access activities:
- `id` - Unique log entry identifier
- `file_id` - Reference to the file
- `user_id` - User who performed the action
- `action` - Type of action (upload, download, view, delete)
- `accessed_at` - When the action occurred
- `ip_address` - IP address of the user (optional)
- `user_agent` - Browser/client information

### 3. User Storage Quotas Table (`user_storage_quotas`)
Manages storage limits per user:
- `user_id` - User identifier (primary key)
- `quota_bytes` - Maximum storage allowed (default: 1GB)
- `used_bytes` - Current storage usage
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

## Setup Instructions

### Step 1: Create Database Tables

Run the SQL commands from `database-schema.sql`:

```bash
# If using Blink's database tool
blink_run_sql < database-schema.sql
```

Or execute the SQL manually:

```sql
-- Run the contents of database-schema.sql
CREATE TABLE IF NOT EXISTS files (...);
CREATE TABLE IF NOT EXISTS file_access_logs (...);
CREATE TABLE IF NOT EXISTS user_storage_quotas (...);
```

### Step 2: Update Components

The updated components (`FileUpload.tsx` and `FileManager.tsx`) are already configured to use the database instead of localStorage.

### Step 3: Database Service

Use the `DatabaseService` class from `src/lib/database.ts` for common database operations:

```typescript
import { DatabaseService } from '@/lib/database'

// Get user's files
const files = await DatabaseService.getUserFiles(userId, {
  limit: 20,
  orderBy: 'uploadedAt',
  order: 'desc',
  search: 'document'
})

// Log file access
await DatabaseService.logFileAccess({
  id: 'log_123',
  fileId: 'file_456',
  userId: 'user_789',
  action: 'download'
})

// Check storage usage
const usage = await DatabaseService.getUserStorageUsage(userId)
const quota = await DatabaseService.getUserStorageQuota(userId)
```

## Key Features

### 1. File Management
- **Upload**: Files are stored in user-specific folders (`clients/{userId}/filename`)
- **Download**: Tracked with access logs
- **Delete**: Removes from both storage and database
- **Search**: Find files by filename

### 2. Access Tracking
- All file operations are logged (upload, download, view, delete)
- Includes timestamp, user, and action type
- Useful for audit trails and analytics

### 3. Storage Quotas
- Each user has a configurable storage limit (default: 1GB)
- Real-time usage tracking
- Prevents uploads that exceed quota

### 4. Analytics
- File count and storage usage statistics
- Access pattern analysis
- Download/view tracking

## API Examples

### Upload a File
```typescript
// 1. Upload to storage
const { publicUrl } = await blink.storage.upload(file, storagePath)

// 2. Save metadata to database
const fileRecord = await DatabaseService.createFile({
  id: generateId(),
  userId: user.id,
  fileName: file.name,
  fileSize: file.size,
  fileType: file.type,
  storagePath,
  publicUrl,
  uploadedAt: new Date().toISOString()
})

// 3. Log the upload
await DatabaseService.logFileAccess({
  id: generateId(),
  fileId: fileRecord.id,
  userId: user.id,
  action: 'upload'
})
```

### Download a File
```typescript
// 1. Get file metadata
const file = await DatabaseService.getFileById(fileId)

// 2. Log the download
await DatabaseService.logFileAccess({
  id: generateId(),
  fileId: file.id,
  userId: user.id,
  action: 'download'
})

// 3. Redirect to file URL
window.open(file.publicUrl, '_blank')
```

### Get User Analytics
```typescript
const stats = await DatabaseService.getFileAccessStats(userId)
// Returns: { totalActions, uploads, downloads, views, deletes }

const usage = await DatabaseService.getUserStorageUsage(userId)
const quota = await DatabaseService.getUserStorageQuota(userId)
```

## Security Considerations

1. **User Isolation**: All queries filter by `user_id` to ensure users only access their own files
2. **Access Logging**: All file operations are logged for audit purposes
3. **Storage Quotas**: Prevent abuse by limiting storage per user
4. **File Validation**: Check file types and sizes before upload

## Migration from localStorage

If you have existing data in localStorage, you can migrate it:

```typescript
const migrateFromLocalStorage = async (userId: string) => {
  const storageKey = `files_${userId}`
  const storedFiles = localStorage.getItem(storageKey)
  
  if (storedFiles) {
    const files = JSON.parse(storedFiles)
    
    for (const file of files) {
      await DatabaseService.createFile({
        id: file.id,
        userId: file.userId,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        storagePath: `clients/${userId}/${file.fileName}`,
        publicUrl: file.publicUrl,
        uploadedAt: file.uploadedAt
      })
    }
    
    // Clear localStorage after migration
    localStorage.removeItem(storageKey)
  }
}
```

## Troubleshooting

### Database Connection Issues
- Ensure the database is properly initialized
- Check that all required tables exist
- Verify user permissions

### Performance Optimization
- Indexes are created on frequently queried columns
- Use pagination for large file lists
- Consider archiving old access logs

### Storage Sync Issues
- Regularly sync `used_bytes` with actual storage usage
- Handle failed uploads by cleaning up database records
- Implement retry logic for database operations