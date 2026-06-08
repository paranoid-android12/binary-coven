import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import SessionCodeCard from '../../components/admin/SessionCodeCard';
import CreateSessionModal from '../../components/admin/CreateSessionModal';
import { adminFetch } from '../../utils/adminFetch';
import { Plus } from 'lucide-react';

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

  useEffect(() => { fetchSessionCodes(); }, []);
  useEffect(() => { filterCodes(); }, [searchQuery, statusFilter, sessionCodes]);

  const fetchSessionCodes = async () => {
    try {
      setLoading(true);
      const response = await adminFetch('/api/session-codes/list');
      const data = await response.json();
      if (data.success) setSessionCodes(data.sessionCodes);
      else setError('Failed to load session codes');
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading session codes');
    } finally {
      setLoading(false);
    }
  };

  const filterCodes = () => {
    let filtered = [...sessionCodes];
    if (statusFilter === 'inactive') filtered = filtered.filter(c => !c.isActive);
    else if (statusFilter !== 'all') filtered = filtered.filter(c => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.code.toLowerCase().includes(q));
    }
    setFilteredCodes(filtered);
  };

  const counts = {
    all: sessionCodes.length,
    active: sessionCodes.filter(c => c.status === 'active').length,
    expired: sessionCodes.filter(c => c.status === 'expired').length,
    scheduled: sessionCodes.filter(c => c.status === 'scheduled').length,
    inactive: sessionCodes.filter(c => !c.isActive).length,
  };

  const filters: { key: typeof statusFilter; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'active', label: `Active (${counts.active})` },
    { key: 'expired', label: `Expired (${counts.expired})` },
    { key: 'scheduled', label: `Scheduled (${counts.scheduled})` },
    { key: 'inactive', label: `Inactive (${counts.inactive})` },
  ];

  return (
    <AdminLayout title="Session Codes">
      <div className="max-w-[1200px] mx-auto space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-admin-card border border-admin-border rounded-lg p-1">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold cursor-pointer border-none transition-colors duration-150 whitespace-nowrap ${
                  statusFilter === f.key
                    ? 'bg-admin-accent text-white'
                    : 'text-admin-text-muted bg-transparent hover:text-admin-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <input
              type="text"
              placeholder="Search code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-3 pr-8 border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-admin-text-faint hover:text-admin-text cursor-pointer border-none bg-transparent text-base leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Create */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 py-2 px-4 bg-admin-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer hover:bg-admin-accent-hover transition-colors duration-150 whitespace-nowrap flex-shrink-0"
          >
            <Plus size={14} />
            New Session
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-admin-text-muted">
            <div className="w-10 h-10 border-4 border-admin-border border-t-admin-accent rounded-full animate-spin-slow mb-4" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-[#b91c1c] text-sm">
            <p className="mb-3">{error}</p>
            <button onClick={fetchSessionCodes} className="bg-[#b91c1c] text-white border-none py-2 px-4 rounded-md text-xs cursor-pointer hover:bg-[#991b1b]">Retry</button>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {searchQuery || statusFilter !== 'all' ? (
              <>
                <p className="text-sm font-semibold text-admin-text mb-1">No session codes found</p>
                <p className="text-xs text-admin-text-muted mb-4">Try adjusting your filters</p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="py-1.5 px-4 bg-admin-card border border-admin-border rounded-md text-xs font-medium text-admin-text cursor-pointer hover:border-admin-border-hover"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-admin-text mb-1">No session codes yet</p>
                <p className="text-xs text-admin-text-muted mb-4">Create a session code to get started</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 py-2 px-4 bg-admin-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer hover:bg-admin-accent-hover"
                >
                  <Plus size={14} />
                  New Session
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4 max-tablet:grid-cols-1">
            {filteredCodes.map(code => (
              <SessionCodeCard key={code.id} sessionCode={code} onRefresh={fetchSessionCodes} />
            ))}
          </div>
        )}

        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchSessionCodes}
        />
      </div>
    </AdminLayout>
  );
}
