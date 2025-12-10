/**
 * AuthService - Handles authentication operations
 * Implements OOP principles: Encapsulation, Single Responsibility
 */
import { supabase } from '@/integrations/supabase/client';
import { BaseService } from './BaseService';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export class AuthService extends BaseService {
  private static instance: AuthService;
  private currentUser: AuthUser | null = null;

  private constructor() {
    super('AuthService');
  }

  /**
   * Singleton pattern - ensures only one instance exists
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Login user with email and password
   */
  public async login(email: string, password: string): Promise<AuthUser> {
    try {
      await this.initialize();
      this.log('Attempting login', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        this.handleError(error, 'login');
      }

      if (data.user) {
        this.currentUser = {
          id: data.user.id,
          email: data.user.email || ''
        };
        this.log('Login successful', { userId: data.user.id });
        return this.currentUser;
      }

      throw new Error('Login failed - no user returned');

    } catch (error) {
      this.handleError(error, 'login');
    }
  }

  /**
   * Logout current user
   */
  public async logout(): Promise<void> {
    try {
      this.log('Logging out user');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        this.handleError(error, 'logout');
      }

      this.currentUser = null;
      localStorage.clear();
      this.log('Logout successful');

    } catch (error) {
      this.handleError(error, 'logout');
    }
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(email: string, redirectUrl: string): Promise<void> {
    try {
      this.log('Sending password reset email', { email });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        this.handleError(error, 'sendPasswordResetEmail');
      }

      this.log('Password reset email sent successfully');

    } catch (error) {
      this.handleError(error, 'sendPasswordResetEmail');
    }
  }

  /**
   * Update user password
   */
  public async updatePassword(newPassword: string): Promise<void> {
    try {
      this.log('Updating password');

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        this.handleError(error, 'updatePassword');
      }

      this.log('Password updated successfully');

    } catch (error) {
      this.handleError(error, 'updatePassword');
    }
  }

  /**
   * Check if user has specific role
   */
  public async hasRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: userId, _role: role });

      if (error) {
        this.log('Error checking role', { error });
        return false;
      }

      return data === true;

    } catch (error) {
      this.log('Error checking role', { error });
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  public async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        this.currentUser = {
          id: user.id,
          email: user.email || ''
        };
        return this.currentUser;
      }

      return null;

    } catch (error) {
      this.log('Error getting current user', { error });
      return null;
    }
  }

  /**
   * Validate password strength
   */
  public validatePassword(password: string): string | null {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  }

  /**
   * Get cached current user (without API call)
   */
  public getCachedUser(): AuthUser | null {
    return this.currentUser;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
