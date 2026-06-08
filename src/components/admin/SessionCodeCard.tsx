import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, AlertTriangle, Users, MoreVertical, Clock } from 'lucide-react';
import { adminFetch } from '../../utils/adminFetch';

interface SessionCodeCardProps {
  sessionCode: {
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
  };
  onRefresh?: () => void;
}

export default function SessionCodeCard({ sessionCode, onRefresh }: SessionCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [extensionDays, setExtensionDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExtendValidity = async () => {
    setIsExtending(true);
    setError(null);
    try {
      const response = await adminFetch(`/api/session-codes/${sessionCode.code}/extend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extensionDays,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to extend validity');
      }

      setShowExtendDialog(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error extending validity:', err);
      setError(err instanceof Error ? err.message : 'Failed to extend validity');
    } finally {
      setIsExtending(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setError(null);
    try {
      const response = await adminFetch(`/api/session-codes/${sessionCode.code}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to deactivate');
      }

      setShowDeactivateConfirm(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error deactivating:', err);
      setError(err instanceof Error ? err.message : 'Failed to deactivate');
    } finally {
      setIsDeactivating(false);
    }
  };

  // Status as a quiet colored dot + label (replaces the heavy filled pill)
  const statusColor = {
    active: 'text-[#4d7c0f]',
    expired: 'text-[#b91c1c]',
    scheduled: 'text-[#475569]',
    inactive: 'text-stone-400',
  }[sessionCode.status] ?? '';

  const statusLabel = {
    active: 'Active',
    expired: 'Expired',
    scheduled: 'Scheduled',
    inactive: 'Inactive',
  }[sessionCode.status] ?? sessionCode.status;

  const isExpiringSoon = () => {
    if (sessionCode.status !== 'active') return false;
    const hoursRemaining = (new Date(sessionCode.validityEnd).getTime() - Date.now()) / 3_600_000;
    return hoursRemaining < 24 && hoursRemaining > 0;
  };

  const formatShortDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const expiringSoon = isExpiringSoon();

  // One quiet meta line summarising the validity window, folding in the "expiring soon" warning
  const metaText = (() => {
    switch (sessionCode.status) {
      case 'active':
        return expiringSoon ? 'Expires within 24h' : `Valid until ${formatShortDate(sessionCode.validityEnd)}`;
      case 'scheduled':
        return `Starts ${formatShortDate(sessionCode.validityStart)}`;
      case 'expired':
        return `Expired ${formatShortDate(sessionCode.validityEnd)}`;
      case 'inactive':
        return 'Deactivated';
      default:
        return '';
    }
  })();

  return (
    <div className={`bg-admin-card border rounded-xl p-5 transition-colors duration-200 ${
      sessionCode.status === 'expired' || sessionCode.status === 'inactive'
        ? 'border-admin-border bg-[#faf9f7] opacity-80 hover:opacity-100 hover:border-admin-border-hover'
        : 'border-admin-border hover:border-admin-accent'
    }`}>
      {/* Header: code (hero) + status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <button
            onClick={handleCopy}
            title="Click to copy code"
            className="group flex items-center gap-2 max-w-full cursor-pointer bg-transparent border-none p-0"
          >
            <span className="font-mono text-2xl font-bold text-admin-text tracking-wide truncate">
              {sessionCode.code}
            </span>
            {copied ? (
              <Check className="text-admin-success flex-shrink-0" size={16} />
            ) : (
              <Copy className="text-admin-text-faint opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0" size={16} />
            )}
          </button>
          <p className={`flex items-center gap-1.5 text-xs mt-1 ${expiringSoon ? 'text-amber-600 font-semibold' : 'text-admin-text-muted'}`}>
            {expiringSoon ? <AlertTriangle size={12} className="flex-shrink-0" /> : <Clock size={12} className="flex-shrink-0" />}
            {metaText}
          </p>
        </div>

        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 ${statusColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>
      </div>

      {/* Stats: one clean divided row, no boxes */}
      <div className="flex items-stretch border-y border-admin-border divide-x divide-admin-border mb-4">
        <div className="flex-1 py-3 pr-4">
          <p className="text-xl font-bold text-admin-text leading-none">
            {sessionCode.studentCount}
            {sessionCode.maxStudents ? <span className="text-xs text-admin-text-faint font-medium">/{sessionCode.maxStudents}</span> : ''}
          </p>
          <p className="text-[11px] text-admin-text-muted mt-1.5">Students</p>
        </div>
        <div className="flex-1 py-3 px-4">
          <p className="text-xl font-bold text-admin-text leading-none">{sessionCode.activeStudents24h}</p>
          <p className="text-[11px] text-admin-text-muted mt-1.5">Active 24h</p>
        </div>
        <div className="flex-1 py-3 pl-4">
          <p className="text-xl font-bold text-admin-text leading-none">
            {sessionCode.questCount === 0 || sessionCode.questCount === undefined ? 'All' : sessionCode.questCount}
          </p>
          <p className="text-[11px] text-admin-text-muted mt-1.5">Quests</p>
        </div>
      </div>

      {/* Footer: single primary action + quiet overflow menu */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/admin/sessions/${sessionCode.code}/students`}
          className="flex items-center gap-2 py-2 px-4 bg-admin-accent text-white border-none rounded-lg text-sm font-semibold no-underline cursor-pointer transition-colors duration-200 hover:bg-admin-accent-hover"
        >
          <Users size={16} />
          View Students
        </Link>

        <div className="relative">
          <button
            className="w-9 h-9 flex items-center justify-center bg-transparent border border-admin-border rounded-lg text-admin-text-muted cursor-pointer transition-colors duration-200 hover:bg-stone-50 hover:text-admin-text"
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-[calc(100%+8px)] bg-admin-card border border-admin-border rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] min-w-[160px] z-[100] overflow-hidden">
              <button
                className="block w-full py-3 px-4 text-left bg-none border-none text-sm text-admin-text cursor-pointer transition-colors duration-200 border-b border-stone-100 last:border-b-0 hover:bg-stone-50 hover:text-admin-accent disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setShowExtendDialog(true);
                  setShowMenu(false);
                }}
                disabled={isExtending}
              >
                Extend Validity
              </button>
              <button
                className="block w-full py-3 px-4 text-left bg-none border-none text-sm text-admin-text cursor-pointer transition-colors duration-200 border-b border-stone-100 last:border-b-0 hover:bg-stone-50 hover:text-admin-accent disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setShowDeactivateConfirm(true);
                  setShowMenu(false);
                }}
                disabled={isDeactivating || !sessionCode.isActive}
              >
                Deactivate
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-[#b91c1c] text-[#b91c1c] py-2.5 px-4 rounded-lg mt-4 text-[13px] font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {showExtendDialog && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1000] p-5" onClick={() => setShowExtendDialog(false)}>
          <div className="bg-admin-card rounded-xl p-7 max-w-[500px] w-full shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-admin-text m-0 mb-3">Extend Validity</h3>
            <p className="text-sm text-admin-text-muted m-0 mb-6 leading-relaxed">
              How many days do you want to extend the validity of this session code?
            </p>
            <div className="mb-6">
              <label htmlFor="extensionDays" className="block text-sm font-semibold text-admin-text mb-2">
                Extension Days:
              </label>
              <input
                id="extensionDays"
                type="number"
                min="1"
                max="365"
                value={extensionDays}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 1)}
                className="w-full py-2.5 px-3.5 border border-admin-border rounded-lg text-sm text-admin-text transition-colors duration-200 focus:outline-none focus:border-admin-accent focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="py-2.5 px-5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-200 bg-stone-100 text-admin-text hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowExtendDialog(false)}
                disabled={isExtending}
              >
                Cancel
              </button>
              <button
                className="py-2.5 px-5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-200 bg-admin-accent text-white hover:bg-admin-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleExtendValidity}
                disabled={isExtending}
              >
                {isExtending ? 'Extending...' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeactivateConfirm && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1000] p-5" onClick={() => setShowDeactivateConfirm(false)}>
          <div className="bg-admin-card rounded-xl p-7 max-w-[500px] w-full shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-admin-text m-0 mb-3">Deactivate Session Code</h3>
            <p className="text-sm text-admin-text-muted m-0 mb-6 leading-relaxed">
              Are you sure you want to deactivate this session code? Students will no longer be able to use it to access the platform.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="py-2.5 px-5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-200 bg-stone-100 text-admin-text hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowDeactivateConfirm(false)}
                disabled={isDeactivating}
              >
                Cancel
              </button>
              <button
                className="py-2.5 px-5 border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-200 bg-[#b91c1c] text-white hover:bg-[#991b1b] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
