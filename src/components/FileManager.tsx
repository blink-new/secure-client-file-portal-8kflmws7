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
  Filter
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { blink } from "@/blink/client"
import { useToast } from "@/hooks/use-toast"

interface FileRecord {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  publicUrl: string
  userId: string
  uploadedAt: string
}

interface FileManagerProps {
  refreshTrigger: number
}

export function FileManager({ refreshTrigger }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalStorage, setTotalStorage] = useState(0)
  const { toast } = useToast()

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true)
      const user = await blink.auth.me()
      
      // Use localStorage for file storage (database not available)
      const storageKey = `files_${user.id}`
      const storedFiles = localStorage.getItem(storageKey)
      const userFiles = storedFiles ? JSON.parse(storedFiles) : []
      
      setFiles(userFiles)
      
      // Calculate total storage used
      const total = userFiles.reduce((sum: number, file: FileRecord) => sum + file.fileSize, 0)
      setTotalStorage(total)
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

  const handleDownload = (file: FileRecord) => {
    window.open(file.publicUrl, '_blank')
  }

  const handleDelete = async (file: FileRecord) => {
    try {
      const user = await blink.auth.me()
      
      // Delete from storage
      await blink.storage.remove(`clients/${user.id}/${file.fileName}`)
      
      // Update localStorage
      const storageKey = `files_${user.id}`
      const storedFiles = localStorage.getItem(storageKey)
      const userFiles = storedFiles ? JSON.parse(storedFiles) : []
      const updatedFiles = userFiles.filter((f: FileRecord) => f.id !== file.id)
      localStorage.setItem(storageKey, JSON.stringify(updatedFiles))
      
      // Update local state
      setFiles(prev => prev.filter(f => f.id !== file.id))
      setTotalStorage(prev => prev - file.fileSize)
      
      toast({
        title: "File deleted",
        description: `${file.fileName} has been deleted`,
      })
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
            <span>My Files ({files.length})</span>
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <HardDrive className="w-4 h-4" />
            <span>{formatFileSize(totalStorage)} used</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    onClick={() => window.open(file.publicUrl, '_blank')}
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
      </CardContent>
    </Card>
  )
}