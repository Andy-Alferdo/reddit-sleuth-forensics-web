import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MovingBackground from '@/components/MovingBackground';
import logo from '@/assets/intel-reddit-logo.png';
import { Shield, Mail, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin();
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail || !resetEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link. The link will expire in 15 minutes.",
      });

      setResetEmail('');
      setIsResetDialogOpen(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forensic-dark to-forensic-darker flex items-center justify-center relative">
      <MovingBackground />
      
      <div className="relative z-10 w-full max-w-md p-6">
        <Card className="backdrop-blur-sm bg-card/90 border-primary/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logo} 
                alt="Intel Reddit Logo" 
                className="w-20 h-20 animate-glow-pulse"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Intel Reddit</CardTitle>
            <p className="text-sm italic text-muted-foreground mt-2 font-serif">
              "Digital footprints never lie, they only wait to be discovered"
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                variant="forensic" 
                className="w-full mt-6"
              >
                Access Forensic Suite
              </Button>
              
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="w-full text-sm text-muted-foreground">
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card z-50">
                  <DialogHeader>
                    <DialogTitle>Reset Your Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a secure reset link.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Security Notice:</strong> The reset link will expire in 15 minutes. 
                        If you don't receive the email, check your spam folder or contact admin support.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setIsResetDialogOpen(false)}
                        disabled={isResetLoading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="forensic" 
                        className="flex-1"
                        disabled={isResetLoading}
                      >
                        {isResetLoading ? (
                          'Sending...'
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Reset Link
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.replace('/admin/login')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin Access
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;