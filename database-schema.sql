-- Database schema for Secure Client File Upload Portal
-- Run this SQL to create the necessary tables

-- Files table to store file metadata
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_files_file_name ON files(file_name);

-- File access logs table to track downloads and access
CREATE TABLE IF NOT EXISTS file_access_logs (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'download', 'view', 'delete', 'upload'
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Create indexes for access logs
CREATE INDEX IF NOT EXISTS idx_access_logs_file_id ON file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON file_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON file_access_logs(accessed_at);

-- User storage quotas table (optional - for managing storage limits)
CREATE TABLE IF NOT EXISTS user_storage_quotas (
  user_id TEXT PRIMARY KEY,
  quota_bytes INTEGER DEFAULT 1073741824, -- 1GB default
  used_bytes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sample queries for common operations:

-- Get all files for a user
-- SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC;

-- Get total storage used by user
-- SELECT SUM(file_size) as total_bytes FROM files WHERE user_id = ?;

-- Get file access history
-- SELECT f.file_name, l.action, l.accessed_at 
-- FROM file_access_logs l 
-- JOIN files f ON l.file_id = f.id 
-- WHERE l.user_id = ? 
-- ORDER BY l.accessed_at DESC;

-- Search files by name
-- SELECT * FROM files WHERE user_id = ? AND file_name LIKE ? ORDER BY uploaded_at DESC;