import React, { Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MovingBackground from '@/components/MovingBackground';
import logo from '@/assets/intel-reddit-logo.png';
import { Shield, Mail, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { authService } from '@/services';

/**
 * LoginPage Props Interface
 */
interface LoginPageProps {
  onLogin: () => void;
}

/**
 * LoginPage State Interface
 */
interface LoginPageState {
  username: string;
  password: string;
  resetEmail: string;
  isResetDialogOpen: boolean;
  isResetLoading: boolean;
}

/**
 * LoginPage Component - Class-based implementation
 * Handles user authentication using OOP principles
 */
class LoginPage extends Component<LoginPageProps, LoginPageState> {
  constructor(props: LoginPageProps) {
    super(props);
    this.state = {
      username: '',
      password: '',
      resetEmail: '',
      isResetDialogOpen: false,
      isResetLoading: false
    };

    // Bind methods
    this.handleLogin = this.handleLogin.bind(this);
    this.handleForgotPassword = this.handleForgotPassword.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.setResetDialogOpen = this.setResetDialogOpen.bind(this);
  }

  /**
   * Handle input changes
   */
  private handleInputChange(field: 'username' | 'password' | 'resetEmail', value: string): void {
    if (field === 'username') {
      this.setState({ username: value });
    } else if (field === 'password') {
      this.setState({ password: value });
    } else if (field === 'resetEmail') {
      this.setState({ resetEmail: value });
    }
  }

  /**
   * Set reset dialog open state
   */
  private setResetDialogOpen(isOpen: boolean): void {
    this.setState({ isResetDialogOpen: isOpen });
  }

  /**
   * Handle login form submission
   */
  private handleLogin(e: React.FormEvent): void {
    e.preventDefault();
    const { username, password } = this.state;
    
    if (username && password) {
      this.props.onLogin();
      window.location.href = '/dashboard';
    }
  }

  /**
   * Handle forgot password submission
   */
  private async handleForgotPassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const { resetEmail } = this.state;

    if (!resetEmail || !resetEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    this.setState({ isResetLoading: true });

    try {
      await authService.sendPasswordResetEmail(
        resetEmail,
        `${window.location.origin}/reset-password`
      );

      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link. The link will expire in 15 minutes.",
      });

      this.setState({ 
        resetEmail: '', 
        isResetDialogOpen: false 
      });

    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      this.setState({ isResetLoading: false });
    }
  }

  /**
   * Render the login form
   */
  private renderLoginForm(): JSX.Element {
    const { username, password } = this.state;

    return (
      <form onSubmit={this.handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => this.handleInputChange('username', e.target.value)}
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
            onChange={(e) => this.handleInputChange('password', e.target.value)}
            required
          />
        </div>
        
        <Button 
          type="submit" 
          variant="forensic" 
          className="w-full mt-6"
        >
          Login
        </Button>
        
        {this.renderResetDialog()}

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
    );
  }

  /**
   * Render reset password dialog
   */
  private renderResetDialog(): JSX.Element {
    const { isResetDialogOpen, resetEmail, isResetLoading } = this.state;

    return (
      <Dialog open={isResetDialogOpen} onOpenChange={this.setResetDialogOpen}>
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
          <form onSubmit={this.handleForgotPassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={resetEmail}
                  onChange={(e) => this.handleInputChange('resetEmail', e.target.value)}
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
                onClick={() => this.setResetDialogOpen(false)}
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
    );
  }

  /**
   * Main render method
   */
  public render(): JSX.Element {
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
              {this.renderLoginForm()}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}

export default LoginPage;
