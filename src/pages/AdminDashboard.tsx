import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, Database, LogOut, Trash2, UserPlus, Edit, KeyRound, Mail, Copy, Clock, FileText, Check, Link } from 'lucide-react';
import { formatDateShort } from '@/lib/dateUtils';
import { useAuditLog } from '@/hooks/useAuditLog';

interface User {
  id: string;
  email: string;
  created_at: string;
  role?: string;
}

interface Invite {
  id: string;
  email: string;
  invite_token: string;
  role: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
  user_email?: string;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('user');
  const [newPassword, setNewPassword] = useState('');
  const [inviteExpireDays, setInviteExpireDays] = useState('7');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [lastGeneratedLink, setLastGeneratedLink] = useState('');
  const [revokeInviteOpen, setRevokeInviteOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
    fetchInvites();
    fetchAuditLogs();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/admin/login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges.",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile: any) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();

          return {
            id: profile.id,
            email: profile.email || 'N/A',
            created_at: profile.created_at,
            role: roleData ? String(roleData.role) : 'user',
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error: any) {
      console.error('Failed to fetch invites:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get user emails for the logs
      const userIds = [...new Set(logs?.map(l => l.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      setAuditLogs(
        (logs || []).map(log => ({
          ...log,
          user_email: emailMap.get(log.user_id) || 'Unknown',
        }))
      );
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleCreateInvite = async () => {
    if (!newUserEmail || !newUserEmail.includes('@')) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate token
      const { data: tokenData, error: tokenError } = await supabase.rpc('generate_invite_token');
      if (tokenError) throw tokenError;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(inviteExpireDays));

      const { data, error } = await supabase
        .from('user_invites')
        .insert({
          email: newUserEmail,
          invite_token: tokenData,
          role: newUserRole as any,
          created_by: user?.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Generate invite link
      const inviteLink = `${window.location.origin}/register?token=${tokenData}`;
      
      // Store the link and show the success dialog
      setLastGeneratedLink(inviteLink);
      setAddUserOpen(false);
      setShowLinkDialog(true);

      // Try to send invite email (non-blocking)
      const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
        body: {
          email: newUserEmail,
          inviteLink,
          role: newUserRole,
          expiresAt: expiresAt.toISOString(),
        },
      });

      if (emailError) {
        console.error('Failed to send invite email:', emailError);
      }

      await logAction({
        actionType: 'invite_create',
        resourceType: 'invite',
        resourceId: data.id,
        details: { email: newUserEmail, role: newUserRole, email_sent: !emailError },
      });

      setNewUserEmail('');
      setNewUserRole('user');
      fetchInvites();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite.",
        variant: "destructive",
      });
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard.",
    });
  };

  const copyLastGeneratedLink = () => {
    navigator.clipboard.writeText(lastGeneratedLink);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard.",
    });
  };

  const openRevokeInvite = (invite: Invite) => {
    setSelectedInvite(invite);
    setRevokeInviteOpen(true);
  };

  const handleRevokeInvite = async () => {
    if (!selectedInvite) return;

    try {
      const { error } = await supabase
        .from('user_invites')
        .delete()
        .eq('id', selectedInvite.id);

      if (error) throw error;

      await logAction({
        actionType: 'invite_revoke',
        resourceType: 'invite',
        resourceId: selectedInvite.id,
        details: { email: selectedInvite.email },
      });

      toast({
        title: "Invite Revoked",
        description: `Invite for ${selectedInvite.email} has been revoked.`,
      });

      setRevokeInviteOpen(false);
      setSelectedInvite(null);
      fetchInvites();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke invite.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUser.id, role: selectedRole as any });

      if (error) throw error;

      await logAction({
        actionType: 'role_change',
        resourceType: 'user',
        resourceId: selectedUser.id,
        details: { old_role: selectedUser.role, new_role: selectedRole },
      });

      toast({
        title: "Success",
        description: `Role updated to ${selectedRole} for ${selectedUser.email}.`,
      });

      setEditRoleOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role.",
        variant: "destructive",
      });
    }
  };

  const openEditRole = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'user');
    setEditRoleOpen(true);
  };

  const openResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetPasswordOpen(true);
  };

  const handleAdminResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use edge function to reset password (requires service role)
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId: selectedUser.id, newPassword },
      });

      if (error) throw error;

      await logAction({
        actionType: 'password_reset',
        resourceType: 'user',
        resourceId: selectedUser.id,
        details: { admin_initiated: true },
      });

      toast({
        title: "Password Reset",
        description: `Password has been reset for ${selectedUser.email}.`,
      });

      setResetPasswordOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    toast({
      title: "Info",
      description: "User deletion requires service role key. Please use the backend console.",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('delete') || action.includes('reset')) return 'destructive';
    if (action.includes('create') || action.includes('generate')) return 'default';
    return 'secondary';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forensic-dark to-forensic-darker p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users, invites, and security</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="invites">
              <Mail className="w-4 h-4 mr-2" />
              Invites
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="w-4 h-4 mr-2" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-4 h-4 mr-2" />
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all registered users</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role || 'user')}>
                              {user.role || 'user'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateShort(user.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditRole(user)} title="Edit Role">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openResetPassword(user)} title="Reset Password">
                                <KeyRound className="w-4 h-4 text-warning" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} title="Delete User">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Invite Management</CardTitle>
                    <CardDescription>Create and manage user invites</CardDescription>
                  </div>
                  <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Invite
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Invite</DialogTitle>
                        <DialogDescription>
                          Generate an invite link for a new investigator.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="investigator@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Select value={newUserRole} onValueChange={setNewUserRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Investigator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="expires">Expires In</Label>
                          <Select value={inviteExpireDays} onValueChange={setInviteExpireDays}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Day</SelectItem>
                              <SelectItem value="7">7 Days</SelectItem>
                              <SelectItem value="30">30 Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddUserOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateInvite}>Create Invite</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {invites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No invites found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => {
                        const isExpired = new Date(invite.expires_at) < new Date();
                        const isUsed = !!invite.used_at;
                        return (
                          <TableRow key={invite.id}>
                            <TableCell className="font-medium">{invite.email}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(invite.role)}>{invite.role}</Badge>
                            </TableCell>
                            <TableCell>
                              {isUsed ? (
                                <Badge variant="outline" className="text-green-500">Used</Badge>
                              ) : isExpired ? (
                                <Badge variant="destructive">Expired</Badge>
                              ) : (
                                <Badge variant="default">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDateShort(invite.expires_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {!isUsed && !isExpired && (
                                  <Button variant="ghost" size="sm" onClick={() => copyInviteLink(invite.invite_token)} title="Copy Link">
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                )}
                                {!isUsed && (
                                  <Button variant="ghost" size="sm" onClick={() => openRevokeInvite(invite)} title="Revoke Invite">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>Recent activity log (last 100 entries)</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No audit logs found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{formatDateShort(log.created_at)}</TableCell>
                          <TableCell className="text-sm">{log.user_email}</TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action_type)}>{log.action_type}</Badge>
                          </TableCell>
                          <TableCell>{log.resource_type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {log.details ? JSON.stringify(log.details) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>System Statistics</CardTitle>
                <CardDescription>Overview of system usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Total Users</h3>
                    <p className="text-3xl font-bold text-primary">{users.length}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Admins</h3>
                    <p className="text-3xl font-bold text-primary">
                      {users.filter(u => u.role === 'admin').length}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Pending Invites</h3>
                    <p className="text-3xl font-bold text-primary">
                      {invites.filter(i => !i.used_at && new Date(i.expires_at) > new Date()).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Role Dialog */}
        <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
              <DialogDescription>Change the role for {selectedUser?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Investigator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRoleOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateRole}>Update Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>Set a new password for {selectedUser?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 chars)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
              <Button onClick={handleAdminResetPassword} variant="destructive">Reset Password</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite Link Success Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Invite Created Successfully
              </DialogTitle>
              <DialogDescription>
                Share this link with the user to let them register. The link will expire based on your settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <code className="text-sm break-all flex-1">{lastGeneratedLink}</code>
              </div>
              <Button onClick={copyLastGeneratedLink} className="w-full" size="lg">
                <Copy className="w-4 h-4 mr-2" />
                Copy Invite Link
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                You can share this via WhatsApp, SMS, email, or any other method.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Invite Confirmation Dialog */}
        <Dialog open={revokeInviteOpen} onOpenChange={setRevokeInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Invite</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke the invite for {selectedInvite?.email}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokeInviteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRevokeInvite}>Revoke Invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;