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
              <button className={styles.menuItem} disabled>
                Extend Validity
              </button>
              <button className={styles.menuItem} disabled>
                Deactivate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
