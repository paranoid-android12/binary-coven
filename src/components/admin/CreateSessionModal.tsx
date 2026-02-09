import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../utils/adminFetch';

// Quest metadata type from API
interface QuestMetadata {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  estimatedTime: number;
  concepts: string[];
  prerequisites: string[];
  fileName: string;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSessionModal({ isOpen, onClose, onSuccess }: CreateSessionModalProps) {
  const [customCode, setCustomCode] = useState('');
  const [durationType, setDurationType] = useState<'hours' | 'days'>('days');
  const [durationValue, setDurationValue] = useState('7');
  const [maxStudents, setMaxStudents] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Quest selection state
  const [availableQuests, setAvailableQuests] = useState<QuestMetadata[]>([]);
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set());
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [questsExpanded, setQuestsExpanded] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories from quests
  const categories = ['all', ...Array.from(new Set(availableQuests.map(q => q.category))).sort()];

  // Filter quests by selected category
  const filteredQuests = selectedCategory === 'all' 
    ? availableQuests 
    : availableQuests.filter(q => q.category === selectedCategory);

  // Load available quests function wrapped in useCallback
  const loadAvailableQuests = useCallback(async () => {
    setLoadingQuests(true);
    try {
      const response = await adminFetch('/api/quests/available');
      if (!response.ok) {
        throw new Error('Failed to load quests');
      }
      const data = await response.json();
      
      if (data.success && data.quests) {
        setAvailableQuests(data.quests);
        // By default, select all quests
        setSelectedQuests(new Set(data.quests.map((q: QuestMetadata) => q.id)));
      }
    } catch (err) {
      console.error('Error loading quests:', err);
    } finally {
      setLoadingQuests(false);
    }
  }, []);

  // Load available quests when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableQuests();
    }
  }, [isOpen, loadAvailableQuests]);

  // Select all quests in the current filtered view
  const handleSelectAll = () => {
    setSelectedQuests(prev => {
      const newSelected = new Set(prev);
      filteredQuests.forEach(q => newSelected.add(q.id));
      return newSelected;
    });
  };

  // Deselect all quests in the current filtered view
  const handleDeselectAll = () => {
    setSelectedQuests(prev => {
      const newSelected = new Set(prev);
      filteredQuests.forEach(q => newSelected.delete(q.id));
      return newSelected;
    });
  };

  // Use functional update to avoid stale state in toggles
  const handleToggleQuest = useCallback((questId: string) => {
    setSelectedQuests(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(questId)) {
        newSelected.delete(questId);
      } else {
        newSelected.add(questId);
      }
      return newSelected;
    });
  }, []);

  // Check if submit should be disabled
  const isSubmitDisabled = loading || loadingQuests || (availableQuests.length > 0 && selectedQuests.size === 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate quests loaded and selected
    if (availableQuests.length === 0) {
      setError('Quests are still loading. Please wait.');
      return;
    }

    if (selectedQuests.size === 0) {
      setError('Please select at least one quest');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {};

      // Add custom code if provided
      if (customCode.trim()) {
        payload.code = customCode.trim().toUpperCase();
      }

      // Add duration
      if (durationType === 'hours') {
        payload.validityHours = parseInt(durationValue);
      } else {
        payload.validityDays = parseInt(durationValue);
      }

      // Add max students if provided
      if (maxStudents.trim()) {
        payload.maxStudents = parseInt(maxStudents);
      }

      // Add selected quests (if not all quests are selected)
      // If all quests are selected, we don't send the array (backward compatibility)
      if (selectedQuests.size < availableQuests.length) {
        // Preserve order from availableQuests
        payload.selectedQuests = availableQuests
          .filter(q => selectedQuests.has(q.id))
          .map(q => q.id);
      }
      // If all quests are selected, don't send selectedQuests (use all quests)

      const response = await adminFetch('/api/session-codes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setCustomCode('');
        setDurationValue('7');
        setMaxStudents('');
        setSelectedQuests(new Set(availableQuests.map(q => q.id)));
        onSuccess();
        onClose();
      } else {
        setError(data.message || 'Failed to create session code');
      }
    } catch (err) {
      console.error('Error creating session code:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex items-center justify-center z-[2000] p-5 animate-[fadeIn_0.2s_ease]" onClick={handleClose}>
      <div className="bg-white rounded-xl w-full max-w-[650px] max-h-[90vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-[slideUp_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between py-[25px] px-[30px] border-b border-gray-200 max-tablet:p-5">
          <h2 className="text-[22px] font-bold text-admin-dark m-0 max-tablet:text-xl">Create New Session Code</h2>
          <button
            className="bg-none border-none text-[32px] text-gray-500 cursor-pointer p-0 w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200 hover:bg-gray-100 hover:text-admin-dark disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-[30px] max-tablet:p-5">
          <div className="mb-[25px]">
            <label htmlFor="customCode" className="block text-sm font-semibold text-gray-700 mb-2">
              Custom Code (Optional)
            </label>
            <input
              type="text"
              id="customCode"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg text-[15px] font-pixel text-admin-dark transition-all duration-300 box-border placeholder:text-gray-400 focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)] disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Leave empty to auto-generate"
              disabled={loading}
              maxLength={20}
            />
            <p className="text-[13px] text-gray-500 mt-1.5 mb-0 italic">
              If empty, a random code will be generated
            </p>
          </div>

          <div className="mb-[25px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Validity Duration</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg text-[15px] font-pixel text-admin-dark transition-all duration-300 focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)] disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                min="1"
                max={durationType === 'hours' ? '720' : '30'}
                required
                disabled={loading}
              />
              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value as 'hours' | 'days')}
                className="py-3 px-4 border-2 border-gray-200 rounded-lg text-[15px] font-pixel text-admin-dark bg-white cursor-pointer transition-all duration-300 min-w-[120px] focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)] disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <p className="text-[13px] text-gray-500 mt-1.5 mb-0 italic">
              How long the session code will be valid
            </p>
          </div>

          <div className="mb-[25px]">
            <label htmlFor="maxStudents" className="block text-sm font-semibold text-gray-700 mb-2">
              Max Students (Optional)
            </label>
            <input
              type="number"
              id="maxStudents"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg text-[15px] font-pixel text-admin-dark transition-all duration-300 box-border placeholder:text-gray-400 focus:outline-none focus:border-admin-primary focus:shadow-[0_0_0_3px_rgba(14,195,201,0.1)] disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Unlimited"
              min="1"
              disabled={loading}
            />
            <p className="text-[13px] text-gray-500 mt-1.5 mb-0 italic">
              Leave empty for unlimited students
            </p>
          </div>

          {/* Quest Selection Section */}
          <div className="mb-[25px]">
            <div 
              className="flex items-center justify-between cursor-pointer mb-2"
              onClick={() => setQuestsExpanded(!questsExpanded)}
            >
              <label className="block text-sm font-semibold text-gray-700 cursor-pointer">
                Quest Selection ({selectedQuests.size}/{availableQuests.length} selected)
              </label>
              <span className="text-gray-500 text-lg">
                {questsExpanded ? '▼' : '▶'}
              </span>
            </div>
            
            {questsExpanded && (
              <>
                {/* Category Filter */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {categories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`py-1 px-2.5 text-xs rounded-full transition-colors ${
                        selectedCategory === category
                          ? 'bg-admin-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      disabled={loading}
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="py-1.5 px-3 text-xs border border-gray-300 bg-white text-gray-600 rounded hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Select All {selectedCategory !== 'all' ? `in ${selectedCategory}` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="py-1.5 px-3 text-xs border border-gray-300 bg-white text-gray-600 rounded hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Deselect All {selectedCategory !== 'all' ? `in ${selectedCategory}` : ''}
                  </button>
                </div>

                {loadingQuests ? (
                  <div className="text-center py-4 text-gray-500">Loading quests...</div>
                ) : filteredQuests.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 border-2 border-gray-200 rounded-lg">
                    No quests in this category
                  </div>
                ) : (
                  <div className="border-2 border-gray-200 rounded-lg max-h-[250px] overflow-y-auto">
                    {filteredQuests.map((quest, index) => (
                      <div
                        key={quest.id}
                        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          index !== filteredQuests.length - 1 ? 'border-b border-gray-100' : ''
                        } ${selectedQuests.has(quest.id) ? 'bg-cyan-50' : ''}`}
                        onClick={() => !loading && handleToggleQuest(quest.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuests.has(quest.id)}
                          onChange={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!loading) handleToggleQuest(quest.id);
                          }}
                          className="mt-1 w-4 h-4 accent-admin-primary cursor-pointer"
                          disabled={loading}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-800">{quest.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              quest.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                              quest.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {quest.difficulty}
                            </span>
                            {quest.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                {quest.category}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{quest.description}</p>
                          {quest.concepts && quest.concepts.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {quest.concepts.slice(0, 3).map(concept => (
                                <span key={concept} className="text-[9px] px-1 py-0.5 bg-blue-50 text-blue-600 rounded">
                                  {concept}
                                </span>
                              ))}
                              {quest.concepts.length > 3 && (
                                <span className="text-[9px] text-gray-400">+{quest.concepts.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[13px] text-gray-500 mt-1.5 mb-0 italic">
                  {selectedQuests.size === availableQuests.length 
                    ? 'All quests will be available to students'
                    : `Only ${selectedQuests.size} selected quest(s) will be available`}
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 py-3 px-4 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-5 border-t border-gray-200 mt-2.5 max-tablet:flex-col-reverse">
            <button
              type="button"
              onClick={handleClose}
              className="py-3 px-6 border-2 border-gray-200 bg-white text-gray-700 rounded-lg text-[15px] font-semibold font-pixel cursor-pointer transition-all duration-300 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed max-tablet:w-full"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-3 px-6 bg-admin-primary-gradient text-white border-none rounded-lg text-[15px] font-semibold font-pixel cursor-pointer transition-all duration-300 hover:bg-admin-primary-gradient-hover hover:shadow-[0_4px_12px_rgba(14,195,201,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none max-tablet:w-full"
              disabled={isSubmitDisabled}
            >
              {loading ? 'Creating...' : loadingQuests ? 'Loading Quests...' : 'Create Session Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
