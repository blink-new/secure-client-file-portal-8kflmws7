import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react"
import { blink } from "@/blink/client"

interface AdminGuardProps {
  children: React.ReactNode
  onBack?: () => void
}

// List of admin user IDs - in a real app, this would be stored in the database
// For now, we'll check if the user's email contains 'admin' or matches specific patterns
const ADMIN_EMAILS = [
  'admin@example.com',
  'kai.jiabo.feng@gmail.com', // Your email from the project info
  // Add more admin emails as needed
]

export function AdminGuard({ children, onBack }: AdminGuardProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const currentUser = await blink.auth.me()
        setUser(currentUser)
        
        // Check if user is admin
        const userIsAdmin = ADMIN_EMAILS.includes(currentUser.email) || 
                           currentUser.email?.includes('admin') ||
                           currentUser.email?.endsWith('@yourdomain.com') // Replace with your domain
        
        setIsAdmin(userIsAdmin)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Checking Admin Access</span>
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

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>Access Denied</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Shield className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Admin Access Required
            </h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access the admin dashboard.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Current user: {user?.email || 'Unknown'}
            </p>
            {onBack && (
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      {children}
    </div>
  )
}