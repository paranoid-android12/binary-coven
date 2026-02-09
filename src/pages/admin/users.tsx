import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Eye, EyeOff } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useUser, isAdminUser } from '../../contexts/UserContext';
import { adminFetch } from '../../utils/adminFetch';

interface AdminUserItem {
  id: string;
  username: string;
  email: string | null;
  role: 'super_admin' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  session_count: number;
}

interface CreateAdminForm {
  username: string;
  password: string;
  email: string;
  role: 'super_admin' | 'admin';
}

export default function UsersPage() {
  const router = useRouter();
  const { user, userType, isLoading } = useUser();
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateAdminForm>({
    username: '',
    password: '',
    email: '',
    role: 'admin',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if user is super admin
  useEffect(() => {
    // Wait for user session to load before checking permissions
    if (isLoading) {
      return;
    }

    if (!user || !isAdminUser(user)) {
      router.push('/admin');
      return;
    }

    if (user.role !== 'super_admin') {
      router.push('/admin');
      return;
    }

    fetchAdminUsers();
  }, [user, router, isLoading]);

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      const response = await adminFetch('/api/admin/list');
      const data = await response.json();

      if (data.success) {
        setAdminUsers(data.admins);
      } else {
        setError('Failed to load admin users');
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setError('An error occurred while loading admin users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const response = await adminFetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setFormData({ username: '', password: '', email: '', role: 'admin' });
        fetchAdminUsers();
      } else {
        setFormError(data.message || 'Failed to create admin user');
      }
    } catch (err) {
      console.error('Error creating admin:', err);
      setFormError('An error occurred while creating admin user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveToggle = async (adminId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'archive' : 'activate'} this admin?`)) {
      return;
    }

    try {
      const response = await adminFetch(`/api/admin/${adminId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      const data = await response.json();

      if (data.success) {
        fetchAdminUsers();
      } else {
        alert(data.message || 'Failed to update admin status');
      }
    } catch (err) {
      console.error('Error updating admin status:', err);
      alert('An error occurred while updating admin status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 px-5 text-gray-500 before:content-[''] before:w-[50px] before:h-[50px] before:border-4 before:border-gray-200 before:border-t-admin-primary before:rounded-full before:animate-spin-slow before:mb-5">
          Loading admin users...
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-xl p-[30px] text-center text-red-600 text-base">{error}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-[30px] max-tablet:flex-col max-tablet:items-start max-tablet:gap-[15px]">
          <h1 className="text-[28px] font-bold text-admin-dark m-0">Admin User Management</h1>
          <button
            className="flex items-center gap-2 py-3 px-6 bg-admin-primary-gradient text-white border-none rounded-lg text-[15px] font-bold font-pixel cursor-pointer transition-all duration-300 shadow-[0_2px_8px_rgba(14,195,201,0.3)] hover:bg-admin-primary-gradient-hover hover:shadow-[0_4px_12px_rgba(14,195,201,0.4)] hover:-translate-y-0.5 max-tablet:w-full max-tablet:justify-center"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Admin
          </button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mb-10">
          <div className="bg-white border border-gray-200 rounded-xl p-[25px] transition-all duration-300 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] max-tablet:grid-cols-1">
            <div className="text-sm text-gray-500 m-0 mb-[5px] font-medium">Total Admins</div>
            <div className="text-[32px] font-bold text-admin-primary m-0">{adminUsers.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-[25px] transition-all duration-300 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="text-sm text-gray-500 m-0 mb-[5px] font-medium">Active Admins</div>
            <div className="text-[32px] font-bold text-admin-primary m-0">
              {adminUsers.filter((a) => a.is_active).length}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-[25px] transition-all duration-300 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="text-sm text-gray-500 m-0 mb-[5px] font-medium">Super Admins</div>
            <div className="text-[32px] font-bold text-admin-primary m-0">
              {adminUsers.filter((a) => a.role === 'super_admin').length}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-tablet:overflow-x-auto">
          <table className="w-full border-collapse max-tablet:min-w-[800px]">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="py-[15px] px-5 text-left text-[13px] font-bold text-gray-700 uppercase tracking-wider">Username</th>
                <th className="py-[15px] px-5 text-left text-[13px] font-bold text-gray-700 uppercase tracking-wider">Email</th>
                <th className="py-[15px] px-5 text-left text-[13px] font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="py-[15px] px-5 text-left text-[13px] font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="py-[15px] px-5 text-left text-[13px] font-bold text-gray-700 uppercase tracking-wider">Sessions</th>
                <th className="py-[15px] px-5 text-left text-[13px] font-bold text-gray-700 uppercase tracking-wider">Created</th>
                <th className="py-[15px] px-5 text-left text-[13px] font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((admin) => (
                <tr key={admin.id} className="border-b border-gray-200 last:border-b-0 transition-colors duration-200 hover:bg-gray-50">
                  <td className="py-[15px] px-5 text-sm text-gray-700 font-semibold text-admin-primary">{admin.username}</td>
                  <td className="py-[15px] px-5 text-sm text-gray-700">{admin.email || '—'}</td>
                  <td className="py-[15px] px-5 text-sm text-gray-700">
                    <span className={`inline-block py-1 px-3 rounded-xl text-xs font-bold uppercase tracking-wider ${admin.role === 'super_admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-500'}`}>
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="py-[15px] px-5 text-sm text-gray-700">
                    <span className={`inline-block py-1 px-3 rounded-xl text-xs font-bold uppercase tracking-wider ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {admin.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="py-[15px] px-5 text-sm text-gray-700 font-semibold text-center">{admin.session_count}</td>
                  <td className="py-[15px] px-5 text-sm text-gray-700">{formatDate(admin.created_at)}</td>
                  <td className="py-[15px] px-5 text-sm text-gray-700">
                    {user && admin.id !== user.id && (
                      <button
                        className={`py-2 px-4 rounded-md text-sm font-semibold font-pixel border-2 border-transparent cursor-pointer transition-all duration-300 ${admin.is_active ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600' : 'bg-emerald-100 text-emerald-700 border-green-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'}`}
                        onClick={() => handleArchiveToggle(admin.id, admin.is_active)}
                      >
                        {admin.is_active ? 'Archive' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showCreateModal && (
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex items-center justify-center z-[1000] p-5 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3)] animate-[modalSlideIn_0.3s_ease] max-tablet:max-w-full max-tablet:m-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-6 border-b-2 border-gray-200 max-tablet:p-5">
                <h2 className="text-2xl font-bold text-admin-dark m-0 font-pixel max-tablet:text-xl">Create Admin User</h2>
                <button
                  className="bg-gray-100 border-none text-[28px] text-gray-500 cursor-pointer p-0 w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300 leading-none hover:bg-gray-200 hover:text-gray-700"
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="p-6 max-tablet:p-5">
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 font-pixel">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                    required
                    autoFocus
                    className="w-full py-3 px-3 border-2 border-gray-200 rounded-lg text-sm font-pixel bg-white text-admin-dark transition-all duration-300 box-border placeholder:text-gray-400 focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)]"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 font-pixel">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password (min 8 characters)"
                      required
                      className="w-full py-3 px-3 pr-10 border-2 border-gray-200 rounded-lg text-sm font-pixel bg-white text-admin-dark transition-all duration-300 box-border placeholder:text-gray-400 focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer p-1 flex items-center justify-center text-gray-500 transition-colors duration-200 hover:text-black"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 font-pixel">Email (optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full py-3 px-3 border-2 border-gray-200 rounded-lg text-sm font-pixel bg-white text-admin-dark transition-all duration-300 box-border placeholder:text-gray-400 focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)]"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 font-pixel">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'super_admin' | 'admin' })}
                    className="w-full py-3 px-3 border-2 border-gray-200 rounded-lg text-sm font-pixel bg-white text-admin-dark transition-all duration-300 box-border focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)]"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {formError && <div className="py-3 px-3 bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm mb-5">{formError}</div>}

                <div className="flex gap-3 justify-end max-tablet:flex-col">
                  <button
                    type="button"
                    className="py-3 px-6 rounded-lg text-[15px] font-bold font-pixel border-none cursor-pointer transition-all duration-300 bg-gray-100 text-gray-500 border-2 border-gray-200 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed max-tablet:w-full"
                    onClick={() => setShowCreateModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-3 px-6 rounded-lg text-[15px] font-bold font-pixel border-none cursor-pointer transition-all duration-300 bg-admin-primary-gradient text-white shadow-[0_2px_8px_rgba(14,195,201,0.3)] hover:bg-admin-primary-gradient-hover hover:shadow-[0_4px_12px_rgba(14,195,201,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed max-tablet:w-full"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
