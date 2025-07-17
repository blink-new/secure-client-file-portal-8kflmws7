import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  File, 
  Download, 
  Trash2, 
  Eye, 
  Calendar,
  HardDrive,
  Search,
  History,
  BarChart3
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  action: string
  accessedAt: string
  fileName?: string
}

interface FileManagerProps {
  refreshTrigger: number
}

export function FileManager({ refreshTrigger }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalStorage, setTotalStorage] = useState(0)
  const { toast } = useToast()

  const logFileAccess = async (fileId: string, action: string) => {
    try {
      await blink.db.fileAccessLogs.create({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileId,
        userId: (await blink.auth.me()).id,
        action,
        accessedAt: new Date().toISOString(),
        ipAddress: '', // Could be populated from request headers
        userAgent: navigator.userAgent
      })
    } catch (error) {
      console.error('Failed to log file access:', error)
    }
  }

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true)
      const user = await blink.auth.me()
      
      // Load files from database
      const userFiles = await blink.db.files.list({
        where: { userId: user.id },
        orderBy: { uploadedAt: 'desc' }
      })
      
      setFiles(userFiles)
      
      // Calculate total storage used
      const total = userFiles.reduce((sum: number, file: FileRecord) => sum + file.fileSize, 0)
      setTotalStorage(total)

      // Load access logs
      const logs = await blink.db.fileAccessLogs.list({
        where: { userId: user.id },
        orderBy: { accessedAt: 'desc' },
        limit: 50
      })
      
      // Enrich logs with file names
      const enrichedLogs = logs.map(log => {
        const file = userFiles.find(f => f.id === log.fileId)
        return {
          ...log,
          fileName: file?.fileName || 'Unknown file'
        }
      })
      
      setAccessLogs(enrichedLogs)
    } catch (error) {
      console.error('Error loading files:', error)
      toast({
        title: "Error loading files",
        description: "Failed to load your files",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadFiles()
  }, [loadFiles, refreshTrigger])

  const handleDownload = async (file: FileRecord) => {
    try {
      // Log the download action
      await logFileAccess(file.id, 'download')
      
      // Open file in new tab
      window.open(file.publicUrl, '_blank')
      
      // Refresh logs to show the new download
      loadFiles()
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handleView = async (file: FileRecord) => {
    try {
      // Log the view action
      await logFileAccess(file.id, 'view')
      
      // Open file in new tab
      window.open(file.publicUrl, '_blank')
      
      // Refresh logs to show the new view
      loadFiles()
    } catch (error) {
      console.error('Error viewing file:', error)
    }
  }

  const handleDelete = async (file: FileRecord) => {
    try {
      // Log the delete action first
      await logFileAccess(file.id, 'delete')
      
      // Delete from storage
      await blink.storage.remove(file.storagePath)
      
      // Delete from database
      await blink.db.files.delete(file.id)
      
      // Update local state
      setFiles(prev => prev.filter(f => f.id !== file.id))
      setTotalStorage(prev => prev - file.fileSize)
      
      toast({
        title: "File deleted",
        description: `${file.fileName} has been deleted`,
      })
      
      // Refresh to update logs
      loadFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Delete failed",
        description: `Failed to delete ${file.fileName}`,
        variant: "destructive"
      })
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
      default: return '📝'
    }
  }

  const filteredFiles = files.filter(file =>
    file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Files</CardTitle>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <File className="w-5 h-5" />
            <span>File Management</span>
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <HardDrive className="w-4 h-4" />
            <span>{formatFileSize(totalStorage)} used</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="files" className="flex items-center space-x-2">
              <File className="w-4 h-4" />
              <span>Files ({files.length})</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Activity</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="files" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Files List */}
            {filteredFiles.length === 0 ? (
              <div className="text-center py-8">
                <File className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'No files match your search' : 'No files uploaded yet'}
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
                        onClick={() => handleDownload(file)}
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
                        onClick={() => handleDelete(file)}
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

          <TabsContent value="activity" className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Recent Activity</h4>
              {accessLogs.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="text-lg flex-shrink-0">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)}ed {log.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(log.accessedAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <File className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{files.length}</p>
                      <p className="text-sm text-gray-600">Total Files</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{formatFileSize(totalStorage)}</p>
                      <p className="text-sm text-gray-600">Storage Used</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Download className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {accessLogs.filter(log => log.action === 'download').length}
                      </p>
                      <p className="text-sm text-gray-600">Downloads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}