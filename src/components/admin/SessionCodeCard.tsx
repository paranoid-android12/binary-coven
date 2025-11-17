import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, AlertTriangle, Users, Zap, MoreVertical } from 'lucide-react';
import styles from '../../styles/admin/SessionCodeCard.module.css';

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
        return styles.statusActive;
      case 'expired':
        return styles.statusExpired;
      case 'scheduled':
        return styles.statusScheduled;
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
    <div className={`${styles.card} ${sessionCode.status === 'expired' ? styles.cardExpired : ''}`}>
      <div className={styles.header}>
        <div className={styles.codeSection}>
          <button onClick={handleCopy} className={styles.codeButton} title="Click to copy">
            <span className={styles.code}>{sessionCode.code}</span>
            {copied ? (
              <Check className={styles.copyIcon} size={18} />
            ) : (
              <Copy className={styles.copyIcon} size={18} />
            )}
          </button>
          {copied && <span className={styles.copiedText}>Copied!</span>}
        </div>

        <div className={styles.statusBadge}>
          <span className={`${styles.status} ${getStatusClass()}`}>
            {(() => {
              const IconComponent = getStatusIcon();
              return IconComponent ? <IconComponent className={styles.statusIcon} size={18} /> : null;
            })()}
            {sessionCode.status}
          </span>
        </div>
      </div>

      {isExpiringSoon() && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          Expires in less than 24 hours
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {sessionCode.studentCount}
              {sessionCode.maxStudents ? ` / ${sessionCode.maxStudents}` : ''}
            </span>
            <span className={styles.statLabel}>Students</span>
          </div>
        </div>

        <div className={styles.stat}>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{sessionCode.activeStudents24h}</span>
            <span className={styles.statLabel}>Active (24h)</span>
          </div>
        </div>
      </div>

      <div className={styles.dates}>
        <div className={styles.dateItem}>
          <span className={styles.dateLabel}>Valid From:</span>
          <span className={styles.dateValue}>{formatDate(sessionCode.validityStart)}</span>
        </div>
        <div className={styles.dateItem}>
          <span className={styles.dateLabel}>Valid Until:</span>
          <span className={styles.dateValue}>{formatDate(sessionCode.validityEnd)}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <Link
          href={`/admin/sessions/${sessionCode.code}/students`}
          className={styles.viewStudentsButton}
        >
          <Users className={styles.buttonIcon} size={18} />
          View Students
        </Link>

        <div className={styles.menuContainer}>
          <button
            className={styles.menuButton}
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <div className={styles.menu}>
              <button
                className={styles.menuItem}
                onClick={() => {
                  setShowExtendDialog(true);
                  setShowMenu(false);
                }}
                disabled={isExtending}
              >
                Extend Validity
              </button>
              <button
                className={styles.menuItem}
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
        <div className={styles.errorBanner}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {error}
        </div>
      )}

      {showExtendDialog && (
        <div className={styles.modalOverlay} onClick={() => setShowExtendDialog(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Extend Validity</h3>
            <p className={styles.modalText}>
              How many days do you want to extend the validity of this session code?
            </p>
            <div className={styles.inputGroup}>
              <label htmlFor="extensionDays" className={styles.inputLabel}>
                Extension Days:
              </label>
              <input
                id="extensionDays"
                type="number"
                min="1"
                max="365"
                value={extensionDays}
                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 1)}
                className={styles.input}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalButtonSecondary}
                onClick={() => setShowExtendDialog(false)}
                disabled={isExtending}
              >
                Cancel
              </button>
              <button
                className={styles.modalButtonPrimary}
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
        <div className={styles.modalOverlay} onClick={() => setShowDeactivateConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Deactivate Session Code</h3>
            <p className={styles.modalText}>
              Are you sure you want to deactivate this session code? Students will no longer be able to use it to access the platform.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalButtonSecondary}
                onClick={() => setShowDeactivateConfirm(false)}
                disabled={isDeactivating}
              >
                Cancel
              </button>
              <button
                className={styles.modalButtonDanger}
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
