import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, Check, X } from 'lucide-react';

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
  const execsWithDuration = codeExecutions.filter((exec) => exec.executionDurationMs != null && !isNaN(exec.executionDurationMs));
  const avgDuration = execsWithDuration.length > 0
    ? (execsWithDuration.reduce((sum, exec) => sum + exec.executionDurationMs, 0) / execsWithDuration.length).toFixed(0)
    : 0;

  if (codeExecutions.length === 0) {
    return (
      <div className="text-center py-12 px-8 bg-admin-card border border-admin-border rounded-xl shadow-sm">
        <FileText className="text-5xl mb-4 opacity-30 text-admin-text-faint" size={48} />
        <p className="text-admin-text-muted text-base m-0">No code executions yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Summary Stats */}
      {!compact && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 mb-6">
            <div className="bg-admin-card border border-admin-border rounded-xl p-6 text-center transition-all duration-300 shadow-sm">
              <div className="text-2xl text-admin-accent leading-none mb-2 font-bold">{codeExecutions.length}</div>
              <div className="text-admin-text-muted text-[0.8rem] uppercase tracking-wider font-medium">Total Runs</div>
            </div>
            <div className="bg-admin-card border border-admin-border rounded-xl p-6 text-center transition-all duration-300 shadow-sm">
              <div className="text-2xl leading-none mb-2 font-bold" style={{ color: '#4d7c0f' }}>
                {successCount}
              </div>
              <div className="text-admin-text-muted text-[0.8rem] uppercase tracking-wider font-medium">Successful</div>
            </div>
            <div className="bg-admin-card border border-admin-border rounded-xl p-6 text-center transition-all duration-300 shadow-sm">
              <div className="text-2xl leading-none mb-2 font-bold" style={{ color: '#b91c1c' }}>
                {failedCount}
              </div>
              <div className="text-admin-text-muted text-[0.8rem] uppercase tracking-wider font-medium">Failed</div>
            </div>
            <div className="bg-admin-card border border-admin-border rounded-xl p-6 text-center transition-all duration-300 shadow-sm">
              <div className="text-2xl text-admin-accent leading-none mb-2 font-bold">{avgDuration}ms</div>
              <div className="text-admin-text-muted text-[0.8rem] uppercase tracking-wider font-medium">Avg Duration</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6 flex-wrap max-tablet:flex-col">
            <select
              value={filterQuest}
              onChange={(e) => setFilterQuest(e.target.value)}
              className="bg-admin-card border border-admin-border rounded-lg py-3 px-4 text-admin-text text-[0.95rem] cursor-pointer transition-all duration-300 min-w-[200px] focus:outline-none focus:border-admin-accent focus:shadow-[0_0_0_3px_rgba(180,83,9,0.1)] hover:border-admin-text-faint max-tablet:w-full"
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
              className="bg-admin-card border border-admin-border rounded-lg py-3 px-4 text-admin-text text-[0.95rem] cursor-pointer transition-all duration-300 min-w-[200px] focus:outline-none focus:border-admin-accent focus:shadow-[0_0_0_3px_rgba(180,83,9,0.1)] hover:border-admin-text-faint max-tablet:w-full"
            >
              <option value="all">All Results</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>
        </>
      )}

      {/* Execution List */}
      <div className="flex flex-col gap-3">
        {filteredExecutions.length === 0 ? (
          <div className="text-center py-8 text-admin-text-muted bg-admin-card border border-admin-border rounded-xl shadow-sm">
            <p>No executions match your filters</p>
          </div>
        ) : (
          filteredExecutions.map((exec) => {
            const success = isSuccess(exec.executionResult);
            const isExpanded = expandedId === exec.id;

            return (
              <div key={exec.id} className="bg-admin-card border border-admin-border rounded-xl overflow-hidden transition-all duration-300 shadow-sm">
                <div className="flex items-center gap-4 p-4 cursor-pointer select-none" onClick={() => toggleExpand(exec.id)}>
                  {success ? (
                    <Check className="text-2xl leading-none flex-shrink-0" size={20} style={{ color: '#4d7c0f' }} />
                  ) : (
                    <X className="text-2xl leading-none flex-shrink-0" size={20} style={{ color: '#b91c1c' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap max-tablet:flex-col max-tablet:items-start">
                      <span className="text-base text-admin-text font-bold">
                        {exec.questId
                          ? exec.questId
                          : 'Overworld'}
                      </span>
                      {exec.phaseId && (
                        <>
                          <span className="text-admin-border max-tablet:hidden">›</span>
                          <span className="text-[0.9rem] text-admin-accent">{exec.phaseId}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-admin-text-muted text-[0.85rem]">{formatDate(exec.executedAt)}</span>
                      <span className="text-admin-border">•</span>
                      <span className="text-admin-text-muted text-[0.85rem]">{exec.executionDurationMs != null ? `${exec.executionDurationMs}ms` : '—'}</span>
                      <span className="text-admin-border">•</span>
                      <span className="text-admin-text-muted text-[0.85rem]">{exec.entityId}</span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="text-admin-text-faint text-[0.85rem] transition-transform duration-300" size={20} />
                  ) : (
                    <ChevronRight className="text-admin-text-faint text-[0.85rem] transition-transform duration-300" size={20} />
                  )}
                </div>

                {isExpanded && (
                  <div className="py-0 px-4 pb-4 border-t border-admin-border bg-admin-bg">
                    <div className="mt-4">
                      <div className="text-admin-accent text-[0.85rem] uppercase tracking-wider mb-2 font-bold">Code:</div>
                      <pre className="bg-gray-800 border border-gray-700 rounded-md p-4 text-amber-300 font-mono text-[0.9rem] overflow-x-auto m-0 whitespace-pre-wrap break-words">{exec.codeContent || 'No code content'}</pre>
                    </div>

                    {exec.executionResult && (
                      <div className="mt-4">
                        <div className="text-admin-accent text-[0.85rem] uppercase tracking-wider mb-2 font-bold">Result:</div>
                        {exec.executionResult.errors && exec.executionResult.errors.length > 0 ? (
                          <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            {exec.executionResult.errors.map((error: any, idx: number) => (
                              <div key={idx} className="text-red-600 text-[0.85rem] mb-2 last:mb-0">
                                {typeof error === 'string' ? error : JSON.stringify(error)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-green-50 border border-green-300 rounded-md p-4 text-green-600 text-[0.85rem]">
                            {exec.executionResult.output ? (
                              <pre className="m-0 whitespace-pre-wrap break-words text-green-600">{exec.executionResult.output}</pre>
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
        <div className="mt-4 pt-4 border-t border-admin-border text-center">
          <p className="text-admin-text-muted m-0 text-[0.9rem]">
            Showing {filteredExecutions.length} of {codeExecutions.length} executions
          </p>
        </div>
      )}
    </div>
  );
}
