import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, AlertTriangle, Users, Zap, MoreVertical } from 'lucide-react';

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
    status: 'active' | 'expired' | 'scheduled';
    maxStudents?: number;
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
      const response = await fetch(`/api/session-codes/${sessionCode.code}/extend`, {
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
      const response = await fetch(`/api/session-codes/${sessionCode.code}/deactivate`, {
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
        return 'bg-emerald-100 text-emerald-700';
      case 'expired':
        return 'bg-red-100 text-red-600';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
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
    <div className={`bg-white border-2 border-gray-200 rounded-xl p-6 transition-all duration-300 shadow-sm hover:border-admin-primary hover:shadow-[0_4px_12px_rgba(14,195,201,0.15)] hover:-translate-y-0.5 max-tablet:p-[18px] ${sessionCode.status === 'expired' ? 'opacity-70 bg-gray-50' : ''}`}>
      <div className="flex items-start justify-between mb-5 gap-[15px] max-tablet:flex-col max-tablet:items-stretch">
        <div className="flex-1 flex items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2.5 bg-gradient-to-br from-[#e0f9fa] to-[#d1f4f6] border-2 border-admin-primary rounded-[10px] py-3 px-5 cursor-pointer transition-all duration-300 hover:bg-gradient-to-br hover:from-[#d1f4f6] hover:to-[#c2eff2] hover:shadow-[0_2px_8px_rgba(14,195,201,0.2)] hover:-translate-y-px active:translate-y-0"
            title="Click to copy"
          >
            <span className="font-pixel text-xl font-bold text-admin-primary-dark tracking-wide">
              {sessionCode.code}
            </span>
            {copied ? (
              <Check className="opacity-70" size={18} />
            ) : (
              <Copy className="opacity-70" size={18} />
            )}
          </button>
          {copied && <span className="text-[13px] text-emerald-600 font-semibold animate-[fadeInOut_2s_ease]">Copied!</span>}
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
        <div className="bg-amber-50 border border-amber-400 text-amber-900 py-2.5 px-4 rounded-lg mb-4 text-[13px] font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          Expires in less than 24 hours
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-5 max-tablet:grid-cols-1">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold text-admin-primary">
              {sessionCode.studentCount}
              {sessionCode.maxStudents ? ` / ${sessionCode.maxStudents}` : ''}
            </span>
            <span className="text-xs text-gray-500 font-medium">Students</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-bold text-admin-primary">{sessionCode.activeStudents24h}</span>
            <span className="text-xs text-gray-500 font-medium">Active (24h)</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg mb-5">
        <div className="flex justify-between items-center gap-3">
          <span className="text-[13px] text-gray-500 font-medium">Valid From:</span>
          <span className="text-[13px] text-gray-700 font-semibold">{formatDate(sessionCode.validityStart)}</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-[13px] text-gray-500 font-medium">Valid Until:</span>
          <span className="text-[13px] text-gray-700 font-semibold">{formatDate(sessionCode.validityEnd)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200 max-tablet:flex-col">
        <Link
          href={`/admin/sessions/${sessionCode.code}/students`}
          className="flex items-center gap-2 py-2.5 px-[18px] bg-admin-primary-gradient text-white border-none rounded-lg text-sm font-semibold font-pixel no-underline cursor-pointer transition-all duration-300 hover:bg-admin-primary-gradient-hover hover:shadow-[0_2px_8px_rgba(14,195,201,0.3)] hover:-translate-y-px active:translate-y-0 max-tablet:w-full max-tablet:justify-center"
        >
          <Users size={18} />
          View Students
        </Link>

        <div className="relative max-tablet:self-stretch">
          <button
            className="w-9 h-9 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 max-tablet:self-stretch"
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-[calc(100%+8px)] bg-white border border-gray-200 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[160px] z-[100] overflow-hidden">
              <button
                className="block w-full py-3 px-4 text-left bg-none border-none text-sm font-pixel text-gray-700 cursor-pointer transition-colors duration-200 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 hover:text-admin-primary disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setShowExtendDialog(true);
                  setShowMenu(false);
                }}
                disabled={isExtending}
              >
                Extend Validity
              </button>
              <button
                className="block w-full py-3 px-4 text-left bg-none border-none text-sm font-pixel text-gray-700 cursor-pointer transition-colors duration-200 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 hover:text-admin-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-red-100 border border-red-600 text-red-800 py-2.5 px-4 rounded-lg mt-4 text-[13px] font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {showExtendDialog && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[1000] p-5" onClick={() => setShowExtendDialog(false)}>
          <div className="bg-white rounded-xl p-7 max-w-[500px] w-full shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 m-0 mb-3 font-pixel">Extend Validity</h3>
            <p className="text-sm text-gray-500 m-0 mb-6 leading-relaxed">
              How many days do you want to extend the validity of this session code?
            </p>
            <div className="mb-6">
              <label htmlFor="extensionDays" className="block text-sm font-semibold text-gray-700 mb-2 font-pixel">
                Extension Days:
              </label>
              <input
                id="extensionDays"
                type="number"
                min="1"
                max="365"
                value={extensionDays}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 1)}
                className="w-full py-2.5 px-3.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 font-pixel transition-colors duration-200 focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)]"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="py-2.5 px-5 border-none rounded-lg text-sm font-semibold font-pixel cursor-pointer transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowExtendDialog(false)}
                disabled={isExtending}
              >
                Cancel
              </button>
              <button
                className="py-2.5 px-5 border-none rounded-lg text-sm font-semibold font-pixel cursor-pointer transition-all duration-200 bg-admin-primary-gradient text-white hover:bg-admin-primary-gradient-hover hover:shadow-[0_2px_8px_rgba(14,195,201,0.3)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
          <div className="bg-white rounded-xl p-7 max-w-[500px] w-full shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 m-0 mb-3 font-pixel">Deactivate Session Code</h3>
            <p className="text-sm text-gray-500 m-0 mb-6 leading-relaxed">
              Are you sure you want to deactivate this session code? Students will no longer be able to use it to access the platform.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="py-2.5 px-5 border-none rounded-lg text-sm font-semibold font-pixel cursor-pointer transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowDeactivateConfirm(false)}
                disabled={isDeactivating}
              >
                Cancel
              </button>
              <button
                className="py-2.5 px-5 border-none rounded-lg text-sm font-semibold font-pixel cursor-pointer transition-all duration-200 bg-gradient-to-br from-red-600 to-red-700 text-white hover:bg-gradient-to-br hover:from-red-700 hover:to-red-800 hover:shadow-[0_2px_8px_rgba(220,38,38,0.3)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
