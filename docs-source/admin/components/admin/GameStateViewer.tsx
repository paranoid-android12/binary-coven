import { useState } from 'react';
import { Database, ChevronDown, ChevronRight } from 'lucide-react';

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
      <div className="text-center py-12 px-8 bg-white border border-gray-200 rounded-xl shadow-sm">
        <Database className="text-5xl mb-4 opacity-30 text-gray-400" size={48} />
        <p className="text-gray-800 text-[1.1rem] m-0 mb-2">No game state saved yet</p>
        <p className="text-gray-500 text-[0.9rem] m-0">
          Game state will appear here once the student saves their progress
        </p>
      </div>
    );
  }

  const state = gameState.game_state;
  const lastSaved = gameState.last_saved;

  return (
    <div className="w-full">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap max-tablet:flex-col max-tablet:items-start">
        <div className="flex gap-2 max-tablet:w-full">
          <button
            className={`bg-white border border-gray-200 rounded-md py-2 px-4 text-gray-500 font-pixel text-[0.85rem] cursor-pointer transition-all duration-300 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 max-tablet:flex-1 max-tablet:text-center ${viewMode === 'structured' ? 'bg-admin-primary border-admin-primary text-white' : ''}`}
            onClick={() => setViewMode('structured')}
          >
            Structured View
          </button>
          <button
            className={`bg-white border border-gray-200 rounded-md py-2 px-4 text-gray-500 font-pixel text-[0.85rem] cursor-pointer transition-all duration-300 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 max-tablet:flex-1 max-tablet:text-center ${viewMode === 'json' ? 'bg-admin-primary border-admin-primary text-white' : ''}`}
            onClick={() => setViewMode('json')}
          >
            JSON View
          </button>
        </div>

        {lastSaved && (
          <div className="text-gray-500 text-[0.85rem]">
            Last saved: {formatDate(new Date(lastSaved).getTime())}
          </div>
        )}
      </div>

      {viewMode === 'structured' ? (
        <div className="flex flex-col gap-4">
          {/* Summary Section */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer select-none transition-colors duration-300 hover:bg-gray-50"
              onClick={() => toggleSection('summary')}
            >
              {expandedSections.has('summary') ? (
                <ChevronDown className="text-admin-primary transition-transform duration-300" size={20} />
              ) : (
                <ChevronRight className="text-admin-primary transition-transform duration-300" size={20} />
              )}
              <h3 className="font-pixel text-[1.1rem] text-gray-800 m-0">Summary</h3>
            </div>
            {expandedSections.has('summary') && (
              <div className="py-0 px-4 pb-4 border-t border-gray-200">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 pt-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Version</div>
                    <div className="text-admin-primary font-pixel text-[1.1rem] font-bold">{state.version || 'N/A'}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Grid Size</div>
                    <div className="text-admin-primary font-pixel text-[1.1rem] font-bold">{state.gridSize || 'N/A'}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Entities</div>
                    <div className="text-admin-primary font-pixel text-[1.1rem] font-bold">{state.entities?.length || 0}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Grid Tiles</div>
                    <div className="text-admin-primary font-pixel text-[1.1rem] font-bold">{state.grids?.length || 0}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Code Windows</div>
                    <div className="text-admin-primary font-pixel text-[1.1rem] font-bold">{state.codeWindows?.length || 0}</div>
                  </div>
                  {state.timestamp && (
                    <div className="flex flex-col gap-1">
                      <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">State Timestamp</div>
                      <div className="text-admin-primary font-pixel text-[1.1rem] font-bold">{formatDate(state.timestamp)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Global Resources Section */}
          {state.globalResources && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer select-none transition-colors duration-300 hover:bg-gray-50"
              onClick={() => toggleSection('resources')}
            >
              {expandedSections.has('resources') ? (
                <ChevronDown className="text-admin-primary transition-transform duration-300" size={20} />
              ) : (
                <ChevronRight className="text-admin-primary transition-transform duration-300" size={20} />
              )}
              <h3 className="font-pixel text-[1.1rem] text-gray-800 m-0">Global Resources</h3>
            </div>
              {expandedSections.has('resources') && (
                <div className="py-0 px-4 pb-4 border-t border-gray-200">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 pt-4">
                    {Object.entries(state.globalResources).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-2 transition-all duration-300 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                        <div className="text-gray-500 text-[0.8rem] capitalize font-medium">{key}</div>
                        <div className="text-admin-primary font-pixel text-2xl font-bold">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Entities Section */}
          {state.entities && state.entities.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer select-none transition-colors duration-300 hover:bg-gray-50"
              onClick={() => toggleSection('entities')}
            >
              {expandedSections.has('entities') ? (
                <ChevronDown className="text-admin-primary transition-transform duration-300" size={20} />
              ) : (
                <ChevronRight className="text-admin-primary transition-transform duration-300" size={20} />
              )}
              <h3 className="font-pixel text-[1.1rem] text-gray-800 m-0">
                Entities ({state.entities.length})
              </h3>
            </div>
              {expandedSections.has('entities') && (
                <div className="py-0 px-4 pb-4 border-t border-gray-200">
                  <div className="flex flex-col gap-3 pt-4">
                    {state.entities.map((entity: any, index: number) => (
                      <div key={entity.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all duration-300 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-4 mb-2 max-tablet:flex-col max-tablet:items-start">
                          <span className="text-admin-primary font-pixel text-base font-bold">{entity.id || `Entity ${index}`}</span>
                          {entity.type && (
                            <span className="text-gray-500 text-[0.85rem] py-1 px-2 bg-gray-200 rounded font-medium">{entity.type}</span>
                          )}
                        </div>
                        <div className="flex gap-4 flex-wrap">
                          {entity.gridX !== undefined && (
                            <span className="text-gray-500 text-[0.85rem]">
                              Position: ({entity.gridX}, {entity.gridY})
                            </span>
                          )}
                          {entity.code && (
                            <span className="text-gray-500 text-[0.85rem]">Has Code</span>
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
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer select-none transition-colors duration-300 hover:bg-gray-50"
              onClick={() => toggleSection('codeWindows')}
            >
              {expandedSections.has('codeWindows') ? (
                <ChevronDown className="text-admin-primary transition-transform duration-300" size={20} />
              ) : (
                <ChevronRight className="text-admin-primary transition-transform duration-300" size={20} />
              )}
              <h3 className="font-pixel text-[1.1rem] text-gray-800 m-0">
                Code Windows ({state.codeWindows.length})
              </h3>
            </div>
              {expandedSections.has('codeWindows') && (
                <div className="py-0 px-4 pb-4 border-t border-gray-200">
                  <div className="flex flex-col gap-4 pt-4">
                    {state.codeWindows.map((window: any, index: number) => (
                      <div key={window.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all duration-300 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-4 mb-3 max-tablet:flex-col max-tablet:items-start">
                          <span className="text-admin-primary font-pixel text-[0.95rem] font-bold">{window.id || `Window ${index}`}</span>
                          {window.entityId && (
                            <span className="text-gray-500 text-[0.8rem]">Entity: {window.entityId}</span>
                          )}
                        </div>
                        {window.code && (
                          <pre className="bg-gray-800 border border-gray-700 rounded-md p-4 text-emerald-400 font-pixel text-[0.85rem] overflow-x-auto m-0 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">{window.code}</pre>
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
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer select-none transition-colors duration-300 hover:bg-gray-50"
              onClick={() => toggleSection('questProgress')}
            >
              {expandedSections.has('questProgress') ? (
                <ChevronDown className="text-admin-primary transition-transform duration-300" size={20} />
              ) : (
                <ChevronRight className="text-admin-primary transition-transform duration-300" size={20} />
              )}
              <h3 className="font-pixel text-[1.1rem] text-gray-800 m-0">Quest Progress</h3>
            </div>
              {expandedSections.has('questProgress') && (
                <div className="py-0 px-4 pb-4 border-t border-gray-200">
                  <pre className="bg-gray-800 border border-gray-700 rounded-md p-4 text-emerald-400 font-pixel text-[0.85rem] overflow-x-auto m-0 whitespace-pre-wrap break-words max-h-[600px] overflow-y-auto">
                    {JSON.stringify(state.questProgress, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <pre className="bg-gray-800 border border-gray-700 rounded-md p-4 text-emerald-400 font-pixel text-[0.85rem] overflow-x-auto m-0 whitespace-pre-wrap break-words max-h-[600px] overflow-y-auto">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
