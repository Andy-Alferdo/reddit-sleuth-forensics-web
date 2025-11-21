import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MovingBackground from '@/components/MovingBackground';
import logo from '@/assets/intel-reddit-logo.png';
import { Shield, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin();
      navigate('/dashboard');
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
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="w-full text-sm text-muted-foreground">
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card z-50">
                  <DialogHeader>
                    <DialogTitle>Password Reset Request</DialogTitle>
                    <DialogDescription>
                      To reset your password, please contact the system administrator.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
                      <Mail className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Contact Admin Support</p>
                        <p className="text-sm text-muted-foreground">
                          Send an email to: <span className="font-mono text-foreground">admin@redditsleuth.com</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Include your username and registered email address. The admin will reset your password manually.
                        </p>
                      </div>
                    </div>
                  </div>
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