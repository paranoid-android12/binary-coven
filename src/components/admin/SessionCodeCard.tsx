import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, AlertTriangle, Users, Zap, MoreVertical, BookOpen, Calendar, Clock } from 'lucide-react';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const getStatusClass = () => {
    switch (sessionCode.status) {
      case 'active':
        return 'bg-lime-50 text-[#4d7c0f]';
      case 'expired':
        return 'bg-red-50 text-[#b91c1c]';
      case 'scheduled':
        return 'bg-slate-100 text-[#475569]';
      case 'inactive':
        return 'bg-stone-100 text-stone-500';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (sessionCode.status) {
      case 'active':
        return Check;
      case 'expired':
        return AlertTriangle;
      case 'scheduled':
        return Zap;
      case 'inactive':
        return AlertTriangle;
      default:
        return null;
    }
  };

  const isExpiringSoon = () => {
    if (sessionCode.status !== 'active') return false;
    const endDate = new Date(sessionCode.validityEnd);
    const now = new Date();
    const hoursRemaining = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursRemaining < 24 && hoursRemaining > 0;
  };

  return (
    <div className={`bg-admin-card border rounded-xl p-6 transition-colors duration-200 max-tablet:p-[18px] ${sessionCode.status === 'expired' || sessionCode.status === 'inactive' ? 'border-admin-border bg-[#faf9f7] opacity-75 hover:opacity-100 hover:border-admin-border-hover' : 'border-admin-border hover:border-admin-accent'}`}>
      <div className="flex items-start justify-between mb-5 gap-3 max-tablet:flex-col max-tablet:items-stretch">
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2.5 bg-stone-50 border border-admin-border rounded-[10px] py-3 px-5 cursor-pointer transition-colors duration-200 hover:border-admin-accent max-w-full overflow-hidden"
            title="Click to copy"
          >
            <span className="font-mono text-xl font-bold text-admin-text tracking-wide truncate">
              {sessionCode.code}
            </span>
            {copied ? (
              <Check className="opacity-70 text-admin-success" size={18} />
            ) : (
              <Copy className="opacity-70 text-admin-text-muted" size={18} />
            )}
          </button>
          {copied && <span className="text-[13px] text-admin-success font-semibold">Copied!</span>}
        </div>

        <div className="flex-shrink-0 max-tablet:self-start">
          <span className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusClass()}`}>
            {(() => {
              const IconComponent = getStatusIcon();
              return IconComponent ? <IconComponent size={18} /> : null;
            })()}
            {sessionCode.status}
          </span>
        </div>
      </div>

      {isExpiringSoon() && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 py-2.5 px-4 rounded-lg mb-4 text-[13px] font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          Expires in less than 24 hours
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-5 max-tablet:grid-cols-1">
        <div className="flex items-center gap-2 py-2.5 px-3 bg-stone-50 rounded-lg overflow-hidden">
          <Users className="text-admin-accent flex-shrink-0" size={14} />
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold text-admin-text leading-none">
              {sessionCode.studentCount}
              {sessionCode.maxStudents ? <span className="text-[10px] text-admin-text-faint font-medium">/{sessionCode.maxStudents}</span> : ''}
            </span>
            <span className="text-[10px] text-admin-text-muted font-medium">Students</span>
          </div>
        </div>

        <div className="flex items-center gap-2 py-2.5 px-3 bg-stone-50 rounded-lg overflow-hidden">
          <Zap className="text-admin-accent flex-shrink-0" size={14} />
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold text-admin-text leading-none">{sessionCode.activeStudents24h}</span>
            <span className="text-[10px] text-admin-text-muted font-medium whitespace-nowrap">Active 24h</span>
          </div>
        </div>

        <div className="flex items-center gap-2 py-2.5 px-3 bg-stone-50 rounded-lg overflow-hidden">
          <BookOpen className="text-admin-accent flex-shrink-0" size={14} />
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold text-admin-text leading-none">
              {sessionCode.questCount === 0 || sessionCode.questCount === undefined ? 'All' : sessionCode.questCount}
            </span>
            <span className="text-[10px] text-admin-text-muted font-medium">Quests</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3.5 bg-stone-50 rounded-lg mb-5">
        <div className="flex justify-between items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] text-admin-text-faint font-medium">
            <Calendar size={13} />
            From
          </span>
          <span className="text-[13px] text-admin-text font-semibold">{formatDate(sessionCode.validityStart)}</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] text-admin-text-faint font-medium">
            <Clock size={13} />
            Until
          </span>
          <span className="text-[13px] text-admin-text font-semibold">{formatDate(sessionCode.validityEnd)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-admin-border max-tablet:flex-col">
        <Link
          href={`/admin/sessions/${sessionCode.code}/students`}
          className="flex items-center gap-2 py-2.5 px-[18px] bg-admin-accent text-white border-none rounded-lg text-sm font-semibold no-underline cursor-pointer transition-colors duration-200 hover:bg-admin-accent-hover max-tablet:w-full max-tablet:justify-center"
        >
          <Users size={18} />
          View Students
        </Link>

        <div className="relative max-tablet:self-stretch">
          <button
            className="w-9 h-9 flex items-center justify-center bg-stone-50 border border-admin-border rounded-lg text-admin-text-muted cursor-pointer transition-colors duration-200 hover:bg-stone-100 hover:text-admin-text max-tablet:self-stretch"
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
          >
            <MoreVertical size={20} />
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
                className="w-full py-2.5 px-3.5 border border-admin-border rounded-lg text-sm text-admin-text transition-colors duration-200 focus:outline-none focus:border-admin-accent focus:shadow-[0_0_0_3px_rgba(180,83,9,0.1)]"
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
