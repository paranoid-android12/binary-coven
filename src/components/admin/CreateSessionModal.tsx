import { useState } from 'react';

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {};

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

      const response = await fetch('/api/session-codes/create', {
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

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex items-center justify-center z-[2000] p-5 animate-[fadeIn_0.2s_ease]" onClick={handleClose}>
      <div className="bg-white rounded-xl w-full max-w-[550px] max-h-[90vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-[slideUp_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
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
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Session Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
