import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import SessionCodeCard from '../../components/admin/SessionCodeCard';
import CreateSessionModal from '../../components/admin/CreateSessionModal';
import { adminFetch } from '../../utils/adminFetch';

interface SessionCode {
  id: string;
  code: string;
  validityStart: string;
  validityEnd: string;
  isActive: boolean;
  createdAt: string;
  studentCount: number;
  activeStudents24h: number;
  status: 'active' | 'expired' | 'scheduled' | 'inactive';
  maxStudents?: number;
  questCount?: number;
}

export default function SessionsPage() {
  const [sessionCodes, setSessionCodes] = useState<SessionCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<SessionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'scheduled' | 'inactive'>('all');

  useEffect(() => {
    fetchSessionCodes();
  }, []);

  useEffect(() => {
    filterCodes();
  }, [searchQuery, statusFilter, sessionCodes]);

  const fetchSessionCodes = async () => {
    try {
      setLoading(true);
      const response = await adminFetch('/api/session-codes/list');
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
    if (statusFilter === 'inactive') {
      filtered = filtered.filter((code) => !code.isActive);
    } else if (statusFilter !== 'all') {
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
      inactive: sessionCodes.filter((c) => !c.isActive).length,
    };
  };

  const counts = getStatusCounts();

  const filterButtonClass = (isActive: boolean) =>
    `py-[10px] px-[18px] bg-admin-card border rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-200 ${
      isActive
        ? 'bg-admin-accent border-admin-accent text-white'
        : 'border-admin-border text-admin-text hover:border-admin-accent hover:text-admin-accent'
    } max-tablet:flex-1 max-tablet:min-w-0 max-tablet:px-3 max-tablet:text-[13px]`;

  return (
    <AdminLayout title="Session Code Management">
      <div className="max-w-[1400px] mx-auto">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-[30px] gap-5 max-laptop:flex-col max-laptop:items-start">
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-admin-text m-0 mb-2">Session Codes</h1>
            <p className="text-[15px] text-admin-text-muted m-0">
              Manage session codes for student access
            </p>
          </div>
          <button
            className="flex items-center gap-2 py-3 px-6 bg-admin-accent text-white border-none rounded-lg text-[15px] font-bold cursor-pointer transition-colors duration-200 flex-shrink-0 hover:bg-admin-accent-hover max-laptop:w-full max-laptop:justify-center"
            onClick={() => setShowCreateModal(true)}
          >
            <span className="text-xl font-bold">+</span>
            Create Session Code
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center justify-between gap-5 mb-[30px] flex-wrap max-laptop:flex-col max-laptop:items-stretch">
          <div className="flex gap-[10px] flex-wrap max-tablet:w-full">
            <button className={filterButtonClass(statusFilter === 'all')} onClick={() => setStatusFilter('all')}>
              All ({counts.all})
            </button>
            <button className={filterButtonClass(statusFilter === 'active')} onClick={() => setStatusFilter('active')}>
              Active ({counts.active})
            </button>
            <button className={filterButtonClass(statusFilter === 'expired')} onClick={() => setStatusFilter('expired')}>
              Expired ({counts.expired})
            </button>
            <button className={filterButtonClass(statusFilter === 'scheduled')} onClick={() => setStatusFilter('scheduled')}>
              Scheduled ({counts.scheduled})
            </button>
            <button className={filterButtonClass(statusFilter === 'inactive')} onClick={() => setStatusFilter('inactive')}>
              Inactive ({counts.inactive})
            </button>
          </div>

          <div className="relative flex-1 max-w-[400px] min-w-[250px] max-laptop:max-w-none">
            <input
              type="text"
              placeholder="Search by code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 pr-10 pl-4 border border-admin-border rounded-lg text-sm text-admin-text transition-colors duration-200 box-border focus:outline-none focus:border-admin-accent focus:shadow-[0_0_0_3px_rgba(180,83,9,0.1)] placeholder:text-admin-text-faint"
            />
            {searchQuery && (
              <button
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-stone-200 border-none rounded-full text-xl text-admin-text-muted cursor-pointer transition-colors duration-200 hover:bg-stone-300 hover:text-admin-text"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-admin-text-muted">
            <div className="w-[50px] h-[50px] border-4 border-admin-border border-t-admin-accent rounded-full animate-spin-slow mb-5"></div>
            <p>Loading session codes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-[30px] text-center text-[#b91c1c]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button
              onClick={fetchSessionCodes}
              className="bg-[#b91c1c] text-white border-none py-[10px] px-5 rounded-lg text-sm cursor-pointer transition-colors duration-200 hover:bg-[#991b1b]"
            >
              Retry
            </button>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
            {searchQuery || statusFilter !== 'all' ? (
              <>
                <div className="text-[72px] mb-5 opacity-70 max-tablet:text-[56px]">🔍</div>
                <h3 className="text-2xl font-bold text-admin-text m-0 mb-[10px] max-tablet:text-xl">No session codes found</h3>
                <p className="text-base text-admin-text-muted m-0 mb-[25px] max-w-[400px] max-tablet:text-sm">
                  Try adjusting your filters or search query
                </p>
                <button
                  className="py-3 px-6 bg-stone-50 border border-admin-border rounded-lg text-[15px] font-semibold text-admin-text cursor-pointer transition-colors duration-200 hover:bg-stone-100 hover:border-admin-border-hover"
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
                <h3 className="text-2xl font-bold text-admin-text m-0 mb-[10px] max-tablet:text-xl">No session codes yet</h3>
                <p className="text-base text-admin-text-muted m-0 mb-[25px] max-w-[400px] max-tablet:text-sm">
                  Create your first session code to get started
                </p>
                <button
                  className="flex items-center gap-2 py-3 px-6 bg-admin-accent text-white border-none rounded-lg text-[15px] font-bold cursor-pointer transition-colors duration-200 hover:bg-admin-accent-hover"
                  onClick={() => setShowCreateModal(true)}
                >
                  <span className="text-xl font-bold">+</span>
                  Create Session Code
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-6 max-laptop:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] max-tablet:grid-cols-1">
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
