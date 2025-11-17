import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Eye, EyeOff } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useUser, isAdminUser } from '../../contexts/UserContext';
import styles from '../../styles/admin/Users.module.css';

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
      const response = await fetch('/api/admin/list');
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
      const response = await fetch('/api/admin/create', {
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
      const response = await fetch(`/api/admin/${adminId}/archive`, {
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
        <div className={styles.loading}>Loading admin users...</div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className={styles.error}>{error}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin User Management</h1>
          <button
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            + Create Admin
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Admins</div>
            <div className={styles.statValue}>{adminUsers.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active Admins</div>
            <div className={styles.statValue}>
              {adminUsers.filter((a) => a.is_active).length}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Super Admins</div>
            <div className={styles.statValue}>
              {adminUsers.filter((a) => a.role === 'super_admin').length}
            </div>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Sessions</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((admin) => (
                <tr key={admin.id}>
                  <td className={styles.username}>{admin.username}</td>
                  <td>{admin.email || '—'}</td>
                  <td>
                    <span className={admin.role === 'super_admin' ? styles.superAdminBadge : styles.adminBadge}>
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td>
                    <span className={admin.is_active ? styles.activeBadge : styles.inactiveBadge}>
                      {admin.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className={styles.sessionCount}>{admin.session_count}</td>
                  <td>{formatDate(admin.created_at)}</td>
                  <td>
                    {user && admin.id !== user.id && (
                      <button
                        className={admin.is_active ? styles.archiveButton : styles.activateButton}
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
          <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Create Admin User</h2>
                <button
                  className={styles.closeButton}
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                    required
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password (min 8 characters)"
                      required
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Email (optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'super_admin' | 'admin' })}
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {formError && <div className={styles.formError}>{formError}</div>}

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowCreateModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
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
