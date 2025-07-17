import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  File, 
  Download, 
  Trash2, 
  Eye, 
  Calendar,
  HardDrive,
  Search,
  Users,
  BarChart3,
  Shield,
  Activity,
  Database
} from "lucide-react"
import { blink } from "@/blink/client"
import { useToast } from "@/hooks/use-toast"

interface FileRecord {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  storagePath: string
  publicUrl: string
  userId: string
  uploadedAt: string
}

interface AccessLog {
  id: string
  fileId: string
  userId: string
  action: string
  accessedAt: string
  fileName?: string
  userEmail?: string
}

interface UserStats {
  userId: string
  userEmail?: string
  fileCount: number
  totalSize: number
  lastActivity: string
}

export function AdminDashboard() {
  const [allFiles, setAllFiles] = useState<FileRecord[]>([])
  const [allLogs, setAllLogs] = useState<AccessLog[]>([])
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const { toast } = useToast()

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load all files from all users
      const files = await blink.db.files.list({
        orderBy: { uploadedAt: 'desc' },
        limit: 1000 // Adjust as needed
      })
      
      setAllFiles(files)

      // Load all access logs
      const logs = await blink.db.fileAccessLogs.list({
        orderBy: { accessedAt: 'desc' },
        limit: 500 // Adjust as needed
      })

      // Enrich logs with file names
      const enrichedLogs = logs.map(log => {
        const file = files.find(f => f.id === log.fileId)
        return {
          ...log,
          fileName: file?.fileName || 'Unknown file'
        }
      })
      
      setAllLogs(enrichedLogs)

      // Calculate user statistics
      const userStatsMap = new Map<string, UserStats>()
      
      files.forEach(file => {
        if (!userStatsMap.has(file.userId)) {
          userStatsMap.set(file.userId, {
            userId: file.userId,
            fileCount: 0,
            totalSize: 0,
            lastActivity: file.uploadedAt
          })
        }
        
        const stats = userStatsMap.get(file.userId)!
        stats.fileCount++
        stats.totalSize += file.fileSize
        
        if (new Date(file.uploadedAt) > new Date(stats.lastActivity)) {
          stats.lastActivity = file.uploadedAt
        }
      })

      // Add activity from logs
      logs.forEach(log => {
        const stats = userStatsMap.get(log.userId)
        if (stats && new Date(log.accessedAt) > new Date(stats.lastActivity)) {
          stats.lastActivity = log.accessedAt
        }
      })

      setUserStats(Array.from(userStatsMap.values()).sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      ))

    } catch (error) {
      console.error('Error loading admin data:', error)
      toast({
        title: "Error loading admin data",
        description: "Failed to load admin dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAdminData()
  }, [loadAdminData])

  const handleAdminDelete = async (file: FileRecord) => {
    if (!confirm(`Are you sure you want to delete "${file.fileName}" from user ${file.userId}?`)) {
      return
    }

    try {
      // Log the admin delete action
      await blink.db.fileAccessLogs.create({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileId: file.id,
        userId: (await blink.auth.me()).id, // Admin user ID
        action: 'admin_delete',
        accessedAt: new Date().toISOString(),
        ipAddress: '',
        userAgent: navigator.userAgent
      })
      
      // Delete from storage
      await blink.storage.remove(file.storagePath)
      
      // Delete from database
      await blink.db.files.delete(file.id)
      
      // Update local state
      setAllFiles(prev => prev.filter(f => f.id !== file.id))
      
      toast({
        title: "File deleted",
        description: `${file.fileName} has been deleted by admin`,
      })
      
      // Refresh data
      loadAdminData()
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Delete failed",
        description: `Failed to delete ${file.fileName}`,
        variant: "destructive"
      })
    }
  }

  const handleView = async (file: FileRecord) => {
    try {
      // Log the admin view action
      await blink.db.fileAccessLogs.create({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileId: file.id,
        userId: (await blink.auth.me()).id, // Admin user ID
        action: 'admin_view',
        accessedAt: new Date().toISOString(),
        ipAddress: '',
        userAgent: navigator.userAgent
      })
      
      // Open file in new tab
      window.open(file.publicUrl, '_blank')
      
    } catch (error) {
      console.error('Error viewing file:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.startsWith('video/')) return '🎥'
    if (fileType.startsWith('audio/')) return '🎵'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📈'
    if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️'
    return '📁'
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return '⬆️'
      case 'download': return '⬇️'
      case 'view': return '👁️'
      case 'delete': return '🗑️'
      case 'admin_view': return '👨‍💼👁️'
      case 'admin_delete': return '👨‍💼🗑️'
      default: return '📝'
    }
  }

  const filteredFiles = allFiles.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.userId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesUser = !selectedUser || file.userId === selectedUser
    return matchesSearch && matchesUser
  })

  const totalFiles = allFiles.length
  const totalStorage = allFiles.reduce((sum, file) => sum + file.fileSize, 0)
  const totalUsers = new Set(allFiles.map(f => f.userId)).size

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Admin Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-red-600" />
            <span>Admin Dashboard</span>
            <Badge variant="destructive" className="ml-2">Admin Only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <File className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFiles}</p>
                <p className="text-sm text-gray-600">Total Files</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <HardDrive className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatFileSize(totalStorage)}</p>
                <p className="text-sm text-gray-600">Total Storage</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allLogs.length}</p>
                <p className="text-sm text-gray-600">Total Actions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="files" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="files" className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>All Files ({totalFiles})</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Users ({totalUsers})</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Activity Log</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="files" className="space-y-4">
              {/* Search and Filter */}
              <div className="flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search files or user IDs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-white"
                >
                  <option value="">All Users</option>
                  {userStats.map(user => (
                    <option key={user.userId} value={user.userId}>
                      {user.userId} ({user.fileCount} files)
                    </option>
                  ))}
                </select>
              </div>

              {/* Files List */}
              {filteredFiles.length === 0 ? (
                <div className="text-center py-8">
                  <File className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || selectedUser ? 'No files match your filters' : 'No files found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-2xl flex-shrink-0">
                        {getFileIcon(file.fileType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {file.fileName}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(file.uploadedAt)}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            User: {file.userId.substring(0, 8)}...
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Badge variant="secondary" className="text-xs">
                          {file.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.publicUrl, '_blank')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(file)}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAdminDelete(file)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">User Statistics</h4>
                {userStats.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userStats.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {user.userId}
                          </p>
                          <p className="text-sm text-gray-500">
                            Last activity: {formatDate(user.lastActivity)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="text-center">
                            <p className="font-medium">{user.fileCount}</p>
                            <p className="text-gray-500">Files</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium">{formatFileSize(user.totalSize)}</p>
                            <p className="text-gray-500">Storage</p>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user.userId)}
                        >
                          View Files
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Recent Activity</h4>
                {allLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="text-lg flex-shrink-0">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {log.action.charAt(0).toUpperCase() + log.action.slice(1).replace('_', ' ')}ed {log.fileName}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>User: {log.userId.substring(0, 8)}...</span>
                            <span>•</span>
                            <span>{formatDate(log.accessedAt)}</span>
                          </div>
                        </div>
                        <Badge 
                          variant={log.action.startsWith('admin_') ? 'destructive' : 'outline'} 
                          className="text-xs"
                        >
                          {log.action}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}