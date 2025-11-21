import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';
import MovingBackground from '@/components/MovingBackground';
import { Shield, ArrowLeft, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleError) throw roleError;

        if (!roleData) {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "You do not have admin privileges.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Access Granted",
          description: "Welcome to the admin dashboard.",
        });
        navigate('/admin/dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forensic-dark to-forensic-darker flex items-center justify-center relative">
      <MovingBackground />
      
      <div className="relative z-10 w-full max-w-md p-6">
        <Card className="backdrop-blur-sm bg-card/90 border-primary/20 shadow-2xl">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-glow-pulse">
                <Shield className="w-12 h-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Admin Access</CardTitle>
            <p className="text-sm italic text-muted-foreground mt-2 font-serif">
              "With great power comes great responsibility"
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
              
              <Button 
                type="submit" 
                variant="forensic" 
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Access Admin Panel'}
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="w-full text-sm text-muted-foreground">
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Password Reset Request</DialogTitle>
                    <DialogDescription>
                      To reset your admin password, please contact the system administrator.
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
                          Include your email address and the admin will reset your password manually.
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
