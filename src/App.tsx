import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { FileUpload } from '@/components/FileUpload'
import { FileManager } from '@/components/FileManager'
import { EmailLogin } from '@/components/auth/EmailLogin'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { AdminGuard } from '@/components/admin/AdminGuard'
import { Toaster } from '@/components/ui/toaster'
import { blink } from '@/blink/client'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <EmailLogin />
  }

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onAdminToggle={() => setShowAdmin(false)} showAdminButton={false} />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <AdminGuard onBack={() => setShowAdmin(false)}>
              <AdminDashboard />
            </AdminGuard>
          </div>
        </main>

        <Toaster />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onAdminToggle={() => setShowAdmin(true)} showAdminButton={true} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to your secure file portal
            </h1>
            <p className="text-gray-600">
              Upload, manage, and access your files securely from anywhere
            </p>
          </div>

          {/* Upload Section */}
          <FileUpload onUploadComplete={handleUploadComplete} />

          {/* File Management Section */}
          <FileManager refreshTrigger={refreshTrigger} />
        </div>
      </main>

      <Toaster />
    </div>
  )
}

export default App