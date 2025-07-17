import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, Shield, Settings } from "lucide-react"
import { blink } from "@/blink/client"

interface HeaderProps {
  user: any
  onAdminToggle?: () => void
  showAdminButton?: boolean
}

export function Header({ user, onAdminToggle, showAdminButton = false }: HeaderProps) {
  const handleLogout = () => {
    blink.auth.logout()
  }

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">SecurePortal</h1>
            <p className="text-sm text-gray-500">Client File Management</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.displayName || user?.email}</p>
            <p className="text-xs text-gray-500">Client Portal</p>
          </div>
          <Avatar>
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showAdminButton && onAdminToggle && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onAdminToggle}
              className="text-orange-600 hover:text-orange-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}