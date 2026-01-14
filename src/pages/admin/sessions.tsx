import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import SessionCodeCard from '../../components/admin/SessionCodeCard';
import CreateSessionModal from '../../components/admin/CreateSessionModal';

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
      <div className="max-w-[1400px] mx-auto">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-[30px] gap-5 max-laptop:flex-col max-laptop:items-start">
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-admin-dark m-0 mb-2">Session Codes</h1>
            <p className="text-[15px] text-[#6b7280] m-0">
              Manage session codes for student access
            </p>
          </div>
          <button
            className="flex items-center gap-2 py-3 px-6 bg-admin-primary-gradient text-white border-none rounded-lg text-[15px] font-bold font-[family-name:var(--font-family-pixel)] cursor-pointer transition-all duration-300 ease-in-out shadow-[0_2px_8px_rgba(14,195,201,0.3)] flex-shrink-0 hover:bg-admin-primary-gradient-hover hover:shadow-[0_4px_12px_rgba(14,195,201,0.4)] hover:-translate-y-[2px] active:translate-y-0 max-laptop:w-full max-laptop:justify-center"
            onClick={() => setShowCreateModal(true)}
          >
            <span className="text-xl font-bold">+</span>
            Create Session Code
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center justify-between gap-5 mb-[30px] flex-wrap max-laptop:flex-col max-laptop:items-stretch">
          <div className="flex gap-[10px] flex-wrap max-tablet:w-full">
            <button
              className={`py-[10px] px-[18px] bg-white border-2 rounded-lg text-sm font-semibold font-[family-name:var(--font-family-pixel)] text-[#374151] cursor-pointer transition-all duration-300 ease-in-out ${
                statusFilter === 'all'
                  ? 'bg-admin-primary-gradient border-admin-primary text-white hover:bg-admin-primary-gradient-hover hover:border-admin-primary-dark'
                  : 'border-[#e5e7eb] hover:border-admin-primary hover:bg-[#f0feff] hover:text-admin-primary-dark'
              } max-tablet:flex-1 max-tablet:min-w-0 max-tablet:px-3 max-tablet:text-[13px]`}
              onClick={() => setStatusFilter('all')}
            >
              All ({counts.all})
            </button>
            <button
              className={`py-[10px] px-[18px] bg-white border-2 rounded-lg text-sm font-semibold font-[family-name:var(--font-family-pixel)] text-[#374151] cursor-pointer transition-all duration-300 ease-in-out ${
                statusFilter === 'active'
                  ? 'bg-admin-primary-gradient border-admin-primary text-white hover:bg-admin-primary-gradient-hover hover:border-admin-primary-dark'
                  : 'border-[#e5e7eb] hover:border-admin-primary hover:bg-[#f0feff] hover:text-admin-primary-dark'
              } max-tablet:flex-1 max-tablet:min-w-0 max-tablet:px-3 max-tablet:text-[13px]`}
              onClick={() => setStatusFilter('active')}
            >
              Active ({counts.active})
            </button>
            <button
              className={`py-[10px] px-[18px] bg-white border-2 rounded-lg text-sm font-semibold font-[family-name:var(--font-family-pixel)] text-[#374151] cursor-pointer transition-all duration-300 ease-in-out ${
                statusFilter === 'expired'
                  ? 'bg-admin-primary-gradient border-admin-primary text-white hover:bg-admin-primary-gradient-hover hover:border-admin-primary-dark'
                  : 'border-[#e5e7eb] hover:border-admin-primary hover:bg-[#f0feff] hover:text-admin-primary-dark'
              } max-tablet:flex-1 max-tablet:min-w-0 max-tablet:px-3 max-tablet:text-[13px]`}
              onClick={() => setStatusFilter('expired')}
            >
              Expired ({counts.expired})
            </button>
            <button
              className={`py-[10px] px-[18px] bg-white border-2 rounded-lg text-sm font-semibold font-[family-name:var(--font-family-pixel)] text-[#374151] cursor-pointer transition-all duration-300 ease-in-out ${
                statusFilter === 'scheduled'
                  ? 'bg-admin-primary-gradient border-admin-primary text-white hover:bg-admin-primary-gradient-hover hover:border-admin-primary-dark'
                  : 'border-[#e5e7eb] hover:border-admin-primary hover:bg-[#f0feff] hover:text-admin-primary-dark'
              } max-tablet:flex-1 max-tablet:min-w-0 max-tablet:px-3 max-tablet:text-[13px]`}
              onClick={() => setStatusFilter('scheduled')}
            >
              Scheduled ({counts.scheduled})
            </button>
          </div>

          <div className="relative flex-1 max-w-[400px] min-w-[250px] max-laptop:max-w-none">
            <input
              type="text"
              placeholder="Search by code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 pr-10 pl-4 border-2 border-[#e5e7eb] rounded-lg text-sm font-[family-name:var(--font-family-pixel)] text-admin-dark transition-all duration-300 ease-in-out box-border focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)] placeholder:text-[#9ca3af]"
            />
            {searchQuery && (
              <button
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-[#e5e7eb] border-none rounded-full text-xl text-[#6b7280] cursor-pointer transition-all duration-200 ease-in-out hover:bg-[#d1d5db] hover:text-[#374151]"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-[#6b7280]">
            <div className="w-[50px] h-[50px] border-4 border-[#e5e7eb] border-t-admin-primary rounded-full animate-spin-slow mb-5"></div>
            <p>Loading session codes...</p>
          </div>
        ) : error ? (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-[30px] text-center text-[#dc2626]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button
              onClick={fetchSessionCodes}
              className="bg-[#dc2626] text-white border-none py-[10px] px-5 rounded-lg text-sm font-[family-name:var(--font-family-pixel)] cursor-pointer transition-colors duration-300 ease-in-out hover:bg-[#b91c1c]"
            >
              Retry
            </button>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
            {searchQuery || statusFilter !== 'all' ? (
              <>
                <div className="text-[72px] mb-5 opacity-70 max-tablet:text-[56px]">🔍</div>
                <h3 className="text-2xl font-bold text-admin-dark m-0 mb-[10px] max-tablet:text-xl">No session codes found</h3>
                <p className="text-base text-[#6b7280] m-0 mb-[25px] max-w-[400px] max-tablet:text-sm">
                  Try adjusting your filters or search query
                </p>
                <button
                  className="py-3 px-6 bg-[#f9fafb] border-2 border-[#e5e7eb] rounded-lg text-[15px] font-semibold font-[family-name:var(--font-family-pixel)] text-[#374151] cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#f3f4f6] hover:border-[#d1d5db]"
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
                <h3 className="text-2xl font-bold text-admin-dark m-0 mb-[10px] max-tablet:text-xl">No session codes yet</h3>
                <p className="text-base text-[#6b7280] m-0 mb-[25px] max-w-[400px] max-tablet:text-sm">
                  Create your first session code to get started
                </p>
                <button
                  className="flex items-center gap-2 py-3 px-6 bg-admin-primary-gradient text-white border-none rounded-lg text-[15px] font-bold font-[family-name:var(--font-family-pixel)] cursor-pointer transition-all duration-300 ease-in-out shadow-[0_2px_8px_rgba(14,195,201,0.3)] hover:bg-admin-primary-gradient-hover hover:shadow-[0_4px_12px_rgba(14,195,201,0.4)] hover:-translate-y-[2px] active:translate-y-0"
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
