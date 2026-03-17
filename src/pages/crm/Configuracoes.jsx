import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { 
    Settings, 
    History, 
    Users, 
    Mail, 
    Plus, 
    Trash2, 
    Loader2, 
    ShieldCheck, 
    UserPlus,
    X
} from 'lucide-react';
import { logAction } from '../../services/auditLogger';

export function Configuracoes() {
    const [activeTab, setActiveTab] = useState('logs');
    const [logs, setLogs] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [config, setConfig] = useState({ notification_emails: [] });
    const [loading, setLoading] = useState(true);
    
    // Notification Emails state
    const [newEmail, setNewEmail] = useState('');
    const [isUpdatingEmails, setIsUpdatingEmails] = useState(false);

    // User Management state
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userForm, setUserForm] = useState({ email: '', full_name: '', role: 'user' });
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    useEffect(() => {
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'users') fetchProfiles();
        if (activeTab === 'notifications') fetchBrandingConfig();
    }, [activeTab]);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (data) setLogs(data);
        setLoading(false);
    };

    const fetchProfiles = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setProfiles(data);
        setLoading(false);
    };

    const fetchBrandingConfig = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('branding_config')
            .select('*')
            .maybeSingle();
        if (data) setConfig(data);
        setLoading(false);
    };

    const handleAddEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) return;
        const updatedEmails = [...(config.notification_emails || []), newEmail];
        
        setIsUpdatingEmails(true);
        try {
            const { error } = await supabase
                .from('branding_config')
                .update({ notification_emails: updatedEmails })
                .eq('id', config.id);
            if (error) throw error;
            setConfig({ ...config, notification_emails: updatedEmails });
            setNewEmail('');
            await logAction('UPDATE_CONFIG', 'Settings', { action: 'add_email', email: newEmail });
        } catch (err) {
            console.error(err);
            alert('Error updating emails.');
        } finally {
            setIsUpdatingEmails(false);
        }
    };

    const handleRemoveEmail = async (emailToRemove) => {
        const updatedEmails = (config.notification_emails || []).filter(e => e !== emailToRemove);
        
        setIsUpdatingEmails(true);
        try {
            const { error } = await supabase
                .from('branding_config')
                .update({ notification_emails: updatedEmails })
                .eq('id', config.id);
            if (error) throw error;
            setConfig({ ...config, notification_emails: updatedEmails });
            await logAction('UPDATE_CONFIG', 'Settings', { action: 'remove_email', email: emailToRemove });
        } catch (err) {
            console.error(err);
            alert('Error removing email.');
        } finally {
            setIsUpdatingEmails(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreatingUser(true);
        try {
            const { data, error } = await supabase.functions.invoke('invite-user', {
                body: { 
                    email: userForm.email, 
                    full_name: userForm.full_name, 
                    role: userForm.role 
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            // Log the success
            await logAction('INVITE_USER_SUCCESS', 'Settings', { target_email: userForm.email, role: userForm.role });
            
            alert('User invited successfully!');
            fetchProfiles();
            setIsUserModalOpen(false);
            setUserForm({ email: '', full_name: '', role: 'user' });
        } catch (err) {
            console.error(err);
            alert(`Error inviting user: ${err.message}`);
            await logAction('INVITE_USER_ERROR', 'Settings', { target_email: userForm.email, error: err.message });
        } finally {
            setIsCreatingUser(false);
        }
    };

    const logColumns = [
        { header: 'Time', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleString() },
        { header: 'Module', accessor: 'module' },
        { header: 'Action', accessor: 'action', render: (row) => (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                row.action.includes('DELETE') ? 'bg-red-100 text-red-700' :
                row.action.includes('UPDATE') ? 'bg-blue-100 text-blue-700' :
                row.action.includes('CREATE') ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
            }`}>
                {row.action}
            </span>
        )},
        { header: 'Details', accessor: 'details', render: (row) => (
            <span className="text-xs text-gray-500 font-mono">
                {JSON.stringify(row.details)}
            </span>
        )},
    ];

    const profileColumns = [
        { header: 'Name', accessor: 'full_name' },
        { header: 'Email', accessor: 'email' },
        { header: 'Role', accessor: 'role', render: (row) => (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                row.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}>
                {row.role}
            </span>
        )},
        { header: 'Joined', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings size={24} /> Configuration
                    </h1>
                    <p className="text-sm text-gray-500">Manage system settings, users, and view audit logs</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                {[
                    { id: 'logs', label: 'Audit Logs', icon: History },
                    { id: 'users', label: 'User Management', icon: Users },
                    { id: 'notifications', label: 'Notifications', icon: Mail },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-4 px-2 font-medium flex items-center gap-2 transition-all ${
                            activeTab === tab.id 
                                ? 'text-[#8B0000] border-b-2 border-[#8B0000]' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
                {activeTab === 'logs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                            <Button variant="outline" size="sm" onClick={fetchLogs}>Refresh</Button>
                        </div>
                        {loading ? (
                            <div className="h-32 flex items-center justify-center text-gray-400">Loading logs...</div>
                        ) : (
                            <Table
                                columns={logColumns}
                                data={logs}
                                keyExtractor={(row) => row.id}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">System Users</h3>
                            <Button size="sm" onClick={() => setIsUserModalOpen(true)}>
                                <UserPlus size={16} className="mr-2" /> Invite User
                            </Button>
                        </div>
                        {loading ? (
                            <div className="h-32 flex items-center justify-center text-gray-400">Loading users...</div>
                        ) : (
                            <Table
                                columns={profileColumns}
                                data={profiles}
                                keyExtractor={(row) => row.id}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="max-w-2xl space-y-6">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4">
                            <ShieldCheck className="text-blue-600 mt-1" size={24} />
                            <div>
                                <p className="text-sm font-bold text-blue-800">Notification Emails</p>
                                <p className="text-xs text-blue-600">
                                    Define which email addresses will receive system notifications (e.g., new service requests).
                                    You can add multiple recipients.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-gray-400 uppercase">Recipients List</label>
                            
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Enter notification email..."
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    containerClassName="flex-1"
                                />
                                <Button 
                                    onClick={handleAddEmail} 
                                    disabled={!newEmail || isUpdatingEmails}
                                >
                                    {isUpdatingEmails ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                {(config.notification_emails || []).map(email => (
                                    <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-gray-400" />
                                            <span className="text-sm font-medium text-gray-700">{email}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveEmail(email)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {(!config.notification_emails || config.notification_emails.length === 0) && (
                                    <p className="text-sm text-gray-400 italic">No email recipients configured.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Invite User Modal */}
            <Modal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                title="Invite New User"
            >
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <Input 
                        label="Full Name"
                        placeholder="John Doe"
                        required
                        value={userForm.full_name}
                        onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                    />
                    <Input 
                        label="Email Address"
                        type="email"
                        placeholder="john@example.com"
                        required
                        value={userForm.email}
                        onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    />
                    <Input 
                        label="Profile Role"
                        type="select"
                        required
                        value={userForm.role}
                        onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                    >
                        <option value="user">Standard User (CRM Access)</option>
                        <option value="admin">Administrator (Settings Access)</option>
                    </Input>

                    <div className="pt-2 flex flex-col gap-2">
                        <Button type="submit" className="w-full" disabled={isCreatingUser}>
                            {isCreatingUser ? <Loader2 className="animate-spin mr-2" /> : <UserPlus size={16} className="mr-2" />}
                            Create Profile & Grant Access
                        </Button>
                        <p className="text-[10px] text-gray-400 text-center px-4 italic">
                            New users will be added to the profiles table. They must sign up using this email at the login page to activate their account.
                        </p>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
