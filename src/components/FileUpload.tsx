import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react"
import { blink } from "@/blink/client"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  onUploadComplete: () => void
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  id: string
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
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

  const handleFiles = useCallback(async (files: File[]) => {
    const user = await blink.auth.me()
    
    for (const file of files) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive"
        })
        continue
      }

      const uploadingFile: UploadingFile = {
        file,
        progress: 0,
        status: 'uploading',
        id: Math.random().toString(36).substr(2, 9)
      }

      setUploadingFiles(prev => [...prev, uploadingFile])

      try {
        const storagePath = `clients/${user.id}/${file.name}`
        
        // Upload to storage
        const { publicUrl } = await blink.storage.upload(
          file,
          storagePath,
          {
            upsert: true,
            onProgress: (percent) => {
              setUploadingFiles(prev => 
                prev.map(f => 
                  f.id === uploadingFile.id 
                    ? { ...f, progress: percent }
                    : f
                )
              )
            }
          }
        )

        // Save file record to database
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        await blink.db.files.create({
          id: fileId,
          userId: user.id,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          storagePath,
          publicUrl,
          uploadedAt: new Date().toISOString()
        })

        // Log the upload action
        await logFileAccess(fileId, 'upload')

        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadingFile.id 
              ? { ...f, status: 'completed', progress: 100 }
              : f
          )
        )

        toast({
          title: "Upload successful",
          description: `${file.name} has been uploaded`,
        })

        onUploadComplete()

      } catch (error) {
        console.error('Upload error:', error)
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadingFile.id 
              ? { ...f, status: 'error' }
              : f
          )
        )

        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        })
      }
    }
  }, [toast, onUploadComplete])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }, [handleFiles])

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Files</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Maximum file size: 10MB
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Select Files
            </label>
          </Button>
        </div>

        {uploadingFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Uploading Files</h4>
            {uploadingFiles.map((uploadingFile) => (
              <div key={uploadingFile.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Progress value={uploadingFile.progress} className="flex-1" />
                    <span className="text-xs text-gray-500">
                      {uploadingFile.progress}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {uploadingFile.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {uploadingFile.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadingFile(uploadingFile.id)}
                  >
                    <X className="w-4 h-4" />
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