import React, { useState } from 'react';
import { BuiltInFunctionRegistry } from '../game/systems/BuiltInFunctions';
import { BuiltInFunction } from '../types/game';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const allFunctions = BuiltInFunctionRegistry.getAllFunctions();
  
  // Get unique categories
  const categories = Array.from(new Set(allFunctions.map(f => f.category)));
  
  // Filter functions based on category and search query
  const filteredFunctions = allFunctions.filter(func => {
    const matchesCategory = selectedCategory === 'all' || func.category === selectedCategory;
    const matchesSearch = func.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         func.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group functions by category for display
  const groupedFunctions = filteredFunctions.reduce((acc, func) => {
    if (!acc[func.category]) {
      acc[func.category] = [];
    }
    acc[func.category].push(func);
    return acc;
  }, {} as Record<string, BuiltInFunction[]>);

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'movement': return '#7ed321';
      case 'interaction': return '#f5a623';
      case 'system': return '#bd10e0';
      case 'utility': return '#50e3c2';
      default: return '#007acc';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 4500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'BoldPixels',
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '800px',
          maxWidth: '90vw',
          height: '700px',
          maxHeight: '90vh',
          backgroundColor: '#2d2d30',
          border: '2px solid #007acc',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#007acc',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📖</span>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontFamily: 'BoldPixels'
            }}>
              Function Glossary
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '24px',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #3c3c3c'
        }}>
          <input
            type="text"
            placeholder="Search functions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1e1e1e',
              border: '1px solid #3c3c3c',
              borderRadius: '4px',
              color: 'white',
              fontSize: '16px',
              fontFamily: 'BoldPixels',
              outline: 'none'
            }}
          />
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 20px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #3c3c3c',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 12px',
              backgroundColor: selectedCategory === 'all' ? '#007acc' : '#3c3c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'BoldPixels',
              whiteSpace: 'nowrap'
            }}
          >
            All ({allFunctions.length})
          </button>
          {categories.map(category => {
            const count = allFunctions.filter(f => f.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedCategory === category ? getCategoryColor(category) : '#3c3c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: 'BoldPixels',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize'
                }}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Function List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}>
          {Object.keys(groupedFunctions).length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#888',
              fontSize: '18px',
              marginTop: '40px'
            }}>
              No functions found matching your search.
            </div>
          ) : (
            Object.entries(groupedFunctions).map(([category, functions]) => (
              <div key={category} style={{ marginBottom: '24px' }}>
                <h3 style={{
                  color: getCategoryColor(category),
                  fontSize: '20px',
                  marginBottom: '12px',
                  textTransform: 'capitalize',
                  fontFamily: 'BoldPixels'
                }}>
                  {category}
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {functions.map(func => (
                    <div
                      key={func.name}
                      style={{
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #3c3c3c',
                        borderRadius: '8px',
                        padding: '16px',
                        color: 'white'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 'bold',
                            fontSize: '18px',
                            color: getCategoryColor(category),
                            marginBottom: '4px',
                            fontFamily: 'monospace'
                          }}>
                            {func.name}({func.parameters.map(p => p.name).join(', ')})
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#cccccc',
                            lineHeight: '1.4',
                            marginBottom: '8px'
                          }}>
                            {func.description}
                          </div>
                        </div>
                        <div style={{
                          padding: '4px 8px',
                          backgroundColor: getCategoryColor(category),
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          {category}
                        </div>
                      </div>

                      {/* Parameters */}
                      {func.parameters.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #3c3c3c'
                        }}>
                          <div style={{
                            fontSize: '14px',
                            color: '#888',
                            marginBottom: '8px',
                            fontWeight: 'bold'
                          }}>
                            Parameters:
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            {func.parameters.map(param => (
                              <div
                                key={param.name}
                                style={{
                                  fontSize: '13px',
                                  color: '#cccccc',
                                  paddingLeft: '12px'
                                }}
                              >
                                <span style={{
                                  color: getCategoryColor(category),
                                  fontWeight: 'bold',
                                  fontFamily: 'monospace'
                                }}>
                                  {param.name}
                                </span>
                                <span style={{ color: '#888' }}>
                                  {' '}({param.type})
                                </span>
                                {param.required && (
                                  <span style={{
                                    color: '#e81123',
                                    fontSize: '11px',
                                    marginLeft: '4px'
                                  }}>
                                    *required
                                  </span>
                                )}
                                {' - '}
                                <span style={{ color: '#aaa' }}>
                                  {param.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#252526',
          borderTop: '1px solid #3c3c3c',
          color: '#888',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {filteredFunctions.length} function{filteredFunctions.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  );
};

export default GlossaryModal;

