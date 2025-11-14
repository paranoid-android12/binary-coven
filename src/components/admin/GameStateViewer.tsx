import { useState } from 'react';
import { Database, ChevronDown, ChevronRight } from 'lucide-react';
import styles from '../../styles/admin/GameStateViewer.module.css';

interface GameStateViewerProps {
  gameState: any;
}

export default function GameStateViewer({ gameState }: GameStateViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [viewMode, setViewMode] = useState<'structured' | 'json'>('structured');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!gameState || !gameState.game_state) {
    return (
      <div className={styles.empty}>
        <Database className={styles.emptyIcon} size={48} />
        <p className={styles.emptyText}>No game state saved yet</p>
        <p className={styles.emptySubtext}>
          Game state will appear here once the student saves their progress
        </p>
      </div>
    );
  }

  const state = gameState.game_state;
  const lastSaved = gameState.last_saved;

  return (
    <div className={styles.container}>
      {/* View Mode Toggle */}
      <div className={styles.controls}>
        <div className={styles.viewModeToggle}>
          <button
            className={`${styles.modeButton} ${viewMode === 'structured' ? styles.modeButtonActive : ''}`}
            onClick={() => setViewMode('structured')}
          >
            Structured View
          </button>
          <button
            className={`${styles.modeButton} ${viewMode === 'json' ? styles.modeButtonActive : ''}`}
            onClick={() => setViewMode('json')}
          >
            JSON View
          </button>
        </div>

        {lastSaved && (
          <div className={styles.lastSaved}>
            Last saved: {formatDate(new Date(lastSaved).getTime())}
          </div>
        )}
      </div>

      {viewMode === 'structured' ? (
        <div className={styles.structuredView}>
          {/* Summary Section */}
          <div className={styles.section}>
            <div
              className={styles.sectionHeader}
              onClick={() => toggleSection('summary')}
            >
              {expandedSections.has('summary') ? (
                <ChevronDown className={styles.expandIcon} size={20} />
              ) : (
                <ChevronRight className={styles.expandIcon} size={20} />
              )}
              <h3 className={styles.sectionTitle}>Summary</h3>
            </div>
            {expandedSections.has('summary') && (
              <div className={styles.sectionContent}>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Version</div>
                    <div className={styles.summaryValue}>{state.version || 'N/A'}</div>
                  </div>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Grid Size</div>
                    <div className={styles.summaryValue}>{state.gridSize || 'N/A'}</div>
                  </div>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Entities</div>
                    <div className={styles.summaryValue}>{state.entities?.length || 0}</div>
                  </div>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Grid Tiles</div>
                    <div className={styles.summaryValue}>{state.grids?.length || 0}</div>
                  </div>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Code Windows</div>
                    <div className={styles.summaryValue}>{state.codeWindows?.length || 0}</div>
                  </div>
                  {state.timestamp && (
                    <div className={styles.summaryItem}>
                      <div className={styles.summaryLabel}>State Timestamp</div>
                      <div className={styles.summaryValue}>{formatDate(state.timestamp)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Global Resources Section */}
          {state.globalResources && (
            <div className={styles.section}>
            <div
              className={styles.sectionHeader}
              onClick={() => toggleSection('resources')}
            >
              {expandedSections.has('resources') ? (
                <ChevronDown className={styles.expandIcon} size={20} />
              ) : (
                <ChevronRight className={styles.expandIcon} size={20} />
              )}
              <h3 className={styles.sectionTitle}>Global Resources</h3>
            </div>
              {expandedSections.has('resources') && (
                <div className={styles.sectionContent}>
                  <div className={styles.resourceGrid}>
                    {Object.entries(state.globalResources).map(([key, value]) => (
                      <div key={key} className={styles.resourceItem}>
                        <div className={styles.resourceName}>{key}</div>
                        <div className={styles.resourceValue}>{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Entities Section */}
          {state.entities && state.entities.length > 0 && (
            <div className={styles.section}>
            <div
              className={styles.sectionHeader}
              onClick={() => toggleSection('entities')}
            >
              {expandedSections.has('entities') ? (
                <ChevronDown className={styles.expandIcon} size={20} />
              ) : (
                <ChevronRight className={styles.expandIcon} size={20} />
              )}
              <h3 className={styles.sectionTitle}>
                Entities ({state.entities.length})
              </h3>
            </div>
              {expandedSections.has('entities') && (
                <div className={styles.sectionContent}>
                  <div className={styles.entityList}>
                    {state.entities.map((entity: any, index: number) => (
                      <div key={entity.id || index} className={styles.entityItem}>
                        <div className={styles.entityHeader}>
                          <span className={styles.entityId}>{entity.id || `Entity ${index}`}</span>
                          {entity.type && (
                            <span className={styles.entityType}>{entity.type}</span>
                          )}
                        </div>
                        <div className={styles.entityProps}>
                          {entity.gridX !== undefined && (
                            <span className={styles.entityProp}>
                              Position: ({entity.gridX}, {entity.gridY})
                            </span>
                          )}
                          {entity.code && (
                            <span className={styles.entityProp}>Has Code</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Code Windows Section */}
          {state.codeWindows && state.codeWindows.length > 0 && (
            <div className={styles.section}>
            <div
              className={styles.sectionHeader}
              onClick={() => toggleSection('codeWindows')}
            >
              {expandedSections.has('codeWindows') ? (
                <ChevronDown className={styles.expandIcon} size={20} />
              ) : (
                <ChevronRight className={styles.expandIcon} size={20} />
              )}
              <h3 className={styles.sectionTitle}>
                Code Windows ({state.codeWindows.length})
              </h3>
            </div>
              {expandedSections.has('codeWindows') && (
                <div className={styles.sectionContent}>
                  <div className={styles.codeWindowList}>
                    {state.codeWindows.map((window: any, index: number) => (
                      <div key={window.id || index} className={styles.codeWindowItem}>
                        <div className={styles.codeWindowHeader}>
                          <span className={styles.codeWindowId}>{window.id || `Window ${index}`}</span>
                          {window.entityId && (
                            <span className={styles.codeWindowEntity}>Entity: {window.entityId}</span>
                          )}
                        </div>
                        {window.code && (
                          <pre className={styles.codeBlock}>{window.code}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quest Progress Section */}
          {state.questProgress && (
            <div className={styles.section}>
            <div
              className={styles.sectionHeader}
              onClick={() => toggleSection('questProgress')}
            >
              {expandedSections.has('questProgress') ? (
                <ChevronDown className={styles.expandIcon} size={20} />
              ) : (
                <ChevronRight className={styles.expandIcon} size={20} />
              )}
              <h3 className={styles.sectionTitle}>Quest Progress</h3>
            </div>
              {expandedSections.has('questProgress') && (
                <div className={styles.sectionContent}>
                  <pre className={styles.jsonBlock}>
                    {JSON.stringify(state.questProgress, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.jsonView}>
          <pre className={styles.jsonBlock}>
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
