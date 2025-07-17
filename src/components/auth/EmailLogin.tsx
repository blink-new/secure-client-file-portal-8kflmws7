import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Mail, Github, Chrome, ArrowLeft, Shield } from 'lucide-react'
import { blink } from '@/blink/client'

interface EmailLoginProps {
  onBack?: () => void
}

export function EmailLogin({ onBack }: EmailLoginProps) {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState<'email' | 'verify'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Simulate sending verification code
      // In a real implementation, this would call an API to send the code
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccess(`Verification code sent to ${email}`)
      setStep('verify')
    } catch (err) {
      setError('Failed to send verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Simulate code verification
      // In a real implementation, this would verify the code and create a session
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (verificationCode === '123456') {
        // For demo purposes, accept 123456 as valid code
        setSuccess('Email verified successfully! Redirecting...')
        // In real implementation, you would create a session here
        setTimeout(() => {
          window.location.reload() // Temporary - would normally set auth state
        }, 1500)
      } else {
        setError('Invalid verification code. Please try again.')
      }
    } catch (err) {
      setError('Failed to verify code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    setError('')
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess('New verification code sent!')
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">SecurePortal</CardTitle>
          <CardDescription>
            {step === 'email' 
              ? 'Enter your email to receive a verification code'
              : 'Enter the verification code sent to your email'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Code...
                  </div>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={loading}
                  className="h-12 text-center text-lg tracking-widest"
                  maxLength={6}
                />
                <p className="text-sm text-gray-600 text-center">
                  Code sent to {email}
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </Button>
              
              <div className="flex items-center justify-between text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('email')}
                  disabled={loading}
                  className="p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Change Email
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="p-0 h-auto"
                >
                  Resend Code
                </Button>
              </div>
            </form>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => blink.auth.login()}
              disabled={loading}
              className="h-12"
            >
              <Chrome className="w-4 h-4 mr-2" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => blink.auth.login()}
              disabled={loading}
              className="h-12"
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>For demo purposes, use verification code: <strong>123456</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}