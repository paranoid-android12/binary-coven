import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import SessionCodeCard from '../../components/admin/SessionCodeCard';
import CreateSessionModal from '../../components/admin/CreateSessionModal';
import styles from '../../styles/admin/Sessions.module.css';

interface SessionCode {
  id: string;
  code: string;
  validityStart: string;
  validityEnd: string;
  isActive: boolean;
  createdAt: string;
  studentCount: number;
  activeStudents24h: number;
  status: 'active' | 'expired' | 'scheduled';
  maxStudents?: number;
}

export default function SessionsPage() {
  const [sessionCodes, setSessionCodes] = useState<SessionCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<SessionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'scheduled'>('all');

  useEffect(() => {
    fetchSessionCodes();
  }, []);

  useEffect(() => {
    filterCodes();
  }, [searchQuery, statusFilter, sessionCodes]);

  const fetchSessionCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/session-codes/list');
      const data = await response.json();

      if (data.success) {
        setSessionCodes(data.sessionCodes);
      } else {
        setError('Failed to load session codes');
      }
    } catch (err) {
      console.error('Error fetching session codes:', err);
      setError('An error occurred while loading session codes');
    } finally {
      setLoading(false);
    }
  };

  const filterCodes = () => {
    let filtered = [...sessionCodes];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((code) => code.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((code) =>
        code.code.toLowerCase().includes(query)
      );
    }

    setFilteredCodes(filtered);
  };

  const handleCreateSuccess = () => {
    fetchSessionCodes();
  };

  const getStatusCounts = () => {
    return {
      all: sessionCodes.length,
      active: sessionCodes.filter((c) => c.status === 'active').length,
      expired: sessionCodes.filter((c) => c.status === 'expired').length,
      scheduled: sessionCodes.filter((c) => c.status === 'scheduled').length,
    };
  };

  const counts = getStatusCounts();

  return (
    <AdminLayout title="Session Code Management">
      <div className={styles.container}>
        {/* Header with Create Button */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Session Codes</h1>
            <p className={styles.subtitle}>
              Manage session codes for student access
            </p>
          </div>
          <button
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            <span className={styles.createIcon}>+</span>
            Create Session Code
          </button>
        </div>

        {/* Filters and Search */}
        <div className={styles.controls}>
          <div className={styles.filterButtons}>
            <button
              className={`${styles.filterButton} ${statusFilter === 'all' ? styles.filterButtonActive : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({counts.all})
            </button>
            <button
              className={`${styles.filterButton} ${statusFilter === 'active' ? styles.filterButtonActive : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active ({counts.active})
            </button>
            <button
              className={`${styles.filterButton} ${statusFilter === 'expired' ? styles.filterButtonActive : ''}`}
              onClick={() => setStatusFilter('expired')}
            >
              Expired ({counts.expired})
            </button>
            <button
              className={`${styles.filterButton} ${statusFilter === 'scheduled' ? styles.filterButtonActive : ''}`}
              onClick={() => setStatusFilter('scheduled')}
            >
              Scheduled ({counts.scheduled})
            </button>
          </div>

          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search by code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading session codes...</p>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={fetchSessionCodes} className={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className={styles.empty}>
            {searchQuery || statusFilter !== 'all' ? (
              <>
                <div className={styles.emptyIcon}>🔍</div>
                <h3 className={styles.emptyTitle}>No session codes found</h3>
                <p className={styles.emptyText}>
                  Try adjusting your filters or search query
                </p>
                <button
                  className={styles.clearFiltersButton}
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <h3 className={styles.emptyTitle}>No session codes yet</h3>
                <p className={styles.emptyText}>
                  Create your first session code to get started
                </p>
                <button
                  className={styles.createButton}
                  onClick={() => setShowCreateModal(true)}
                >
                  <span className={styles.createIcon}>+</span>
                  Create Session Code
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredCodes.map((code) => (
              <SessionCodeCard
                key={code.id}
                sessionCode={code}
                onRefresh={fetchSessionCodes}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </AdminLayout>
  );
}
