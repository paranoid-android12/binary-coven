import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import styles from '../../styles/admin/CodeExecutionViewer.module.css';

interface CodeExecution {
  id: string;
  questId: string;
  phaseId: string;
  codeWindowId: string;
  codeContent: string;
  executionResult: any;
  executedAt: string;
  entityId: string;
  executionDurationMs: number;
}

interface CodeExecutionViewerProps {
  codeExecutions: CodeExecution[];
  compact?: boolean;
}

export default function CodeExecutionViewer({ codeExecutions, compact = false }: CodeExecutionViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterQuest, setFilterQuest] = useState<string>('all');
  const [filterSuccess, setFilterSuccess] = useState<string>('all');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const isSuccess = (result: any) => {
    if (!result) return false;
    return result.success === true || (result.errors && result.errors.length === 0);
  };

  const getUniqueQuests = () => {
    const quests = new Set(codeExecutions.map((exec) => exec.questId).filter(Boolean));
    return Array.from(quests);
  };

  const filteredExecutions = codeExecutions.filter((exec) => {
    if (filterQuest !== 'all' && exec.questId !== filterQuest) return false;
    if (filterSuccess === 'success' && !isSuccess(exec.executionResult)) return false;
    if (filterSuccess === 'failed' && isSuccess(exec.executionResult)) return false;
    return true;
  });

  const uniqueQuests = getUniqueQuests();
  const successCount = codeExecutions.filter((exec) => isSuccess(exec.executionResult)).length;
  const failedCount = codeExecutions.length - successCount;
  const avgDuration = codeExecutions.length > 0
    ? (codeExecutions.reduce((sum, exec) => sum + exec.executionDurationMs, 0) / codeExecutions.length).toFixed(0)
    : 0;

  if (codeExecutions.length === 0) {
    return (
      <div className={styles.empty}>
        <FileText className={styles.emptyIcon} size={48} />
        <p className={styles.emptyText}>No code executions yet</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Summary Stats */}
      {!compact && (
        <>
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{codeExecutions.length}</div>
              <div className={styles.summaryLabel}>Total Runs</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue} style={{ color: '#75ba75' }}>
                {successCount}
              </div>
              <div className={styles.summaryLabel}>Successful</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue} style={{ color: '#ff4444' }}>
                {failedCount}
              </div>
              <div className={styles.summaryLabel}>Failed</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{avgDuration}ms</div>
              <div className={styles.summaryLabel}>Avg Duration</div>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <select
              value={filterQuest}
              onChange={(e) => setFilterQuest(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Quests</option>
              {uniqueQuests.map((questId) => (
                <option key={questId} value={questId}>
                  {questId}
                </option>
              ))}
            </select>

            <select
              value={filterSuccess}
              onChange={(e) => setFilterSuccess(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Results</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>
        </>
      )}

      {/* Execution List */}
      <div className={styles.executionList}>
        {filteredExecutions.length === 0 ? (
          <div className={styles.noResults}>
            <p>No executions match your filters</p>
          </div>
        ) : (
          filteredExecutions.map((exec) => {
            const success = isSuccess(exec.executionResult);
            const isExpanded = expandedId === exec.id;

            return (
              <div key={exec.id} className={styles.executionItem}>
                <div className={styles.executionHeader} onClick={() => toggleExpand(exec.id)}>
                  {success ? (
                    <Check className={styles.statusIcon} size={20} style={{ color: '#75ba75' }} />
                  ) : (
                    <X className={styles.statusIcon} size={20} style={{ color: '#ff4444' }} />
                  )}
                  <div className={styles.executionInfo}>
                    <div className={styles.executionTitle}>
                      <span className={styles.questId}>
                        {exec.questId
                          ? exec.questId
                          : 'Overworld'}
                      </span>
                      {exec.phaseId && (
                        <>
                          <span className={styles.separator}>›</span>
                          <span className={styles.phaseId}>{exec.phaseId}</span>
                        </>
                      )}
                    </div>
                    <div className={styles.executionMeta}>
                      <span className={styles.metaItem}>{formatDate(exec.executedAt)}</span>
                      <span className={styles.metaSeparator}>•</span>
                      <span className={styles.metaItem}>{exec.executionDurationMs}ms</span>
                      <span className={styles.metaSeparator}>•</span>
                      <span className={styles.metaItem}>{exec.entityId}</span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className={styles.expandIcon} size={20} />
                  ) : (
                    <ChevronRight className={styles.expandIcon} size={20} />
                  )}
                </div>

                {isExpanded && (
                  <div className={styles.executionDetails}>
                    <div className={styles.codeSection}>
                      <div className={styles.sectionLabel}>Code:</div>
                      <pre className={styles.codeBlock}>{exec.codeContent || 'No code content'}</pre>
                    </div>

                    {exec.executionResult && (
                      <div className={styles.resultSection}>
                        <div className={styles.sectionLabel}>Result:</div>
                        {exec.executionResult.errors && exec.executionResult.errors.length > 0 ? (
                          <div className={styles.errorBlock}>
                            {exec.executionResult.errors.map((error: any, idx: number) => (
                              <div key={idx} className={styles.errorItem}>
                                {typeof error === 'string' ? error : JSON.stringify(error)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.successBlock}>
                            {exec.executionResult.output ? (
                              <pre>{exec.executionResult.output}</pre>
                            ) : (
                              <span>Execution successful</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!compact && filteredExecutions.length > 0 && (
        <div className={styles.footer}>
          <p className={styles.resultCount}>
            Showing {filteredExecutions.length} of {codeExecutions.length} executions
          </p>
        </div>
      )}
    </div>
  );
}
