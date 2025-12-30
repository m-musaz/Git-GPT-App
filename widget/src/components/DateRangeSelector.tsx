import { useState } from 'react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { theme } from '../theme';

interface DateRangeSelectorProps {
  isDark: boolean;
  isRefreshing: boolean;
  onRangeChange: (startDate?: string, endDate?: string) => void;
}

export function DateRangeSelector({ isDark, isRefreshing, onRangeChange }: DateRangeSelectorProps) {
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleQuickRange = (range: 'next-2-weeks' | 'next-month' | 'custom') => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (range) {
      case 'next-2-weeks':
        start = now.toISOString();
        end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'next-month':
        start = now.toISOString();
        end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'custom':
        setShowDateRange(true);
        return;
    }

    onRangeChange(start, end);
  };

  const handleCustomDateRange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate + 'T23:59:59').toISOString();
      onRangeChange(start, end);
      setShowDateRange(false);
    }
  };

  const handleClearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setShowDateRange(false);
    onRangeChange(); // Refresh with default range
  };

  return (
    <div className={`p-3 rounded-xl border ${theme.card(isDark)}`}>
      <label className={`text-xs font-semibold uppercase tracking-wide ${theme.textPrimary(isDark)} block mb-2`}>
        Date Range
      </label>
      
      {showDateRange ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs ${theme.textPrimary(isDark)} block mb-1`}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  isDark 
                    ? 'bg-slate-800 border-slate-600 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`text-xs ${theme.textPrimary(isDark)} block mb-1`}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  isDark 
                    ? 'bg-slate-800 border-slate-600 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className={`flex-1 rounded-xl py-2 ${theme.textPrimary(isDark)} ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`}
              color="primary"
              size="sm"
              onClick={handleCustomDateRange}
              disabled={!startDate || !endDate}
            >
              Apply
            </Button>
            <Button
              className={`rounded-xl px-2 py-2 ${theme.textPrimary(isDark)} ${theme.buttonBorder(isDark)} ${theme.buttonShadow()}`}
              variant="outline"
              color="secondary"
              size="sm"
              onClick={handleClearDateRange}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <select
          onChange={(e) => handleQuickRange(e.target.value as any)}
          disabled={isRefreshing}
          className={`w-full px-3 py-2 text-sm rounded-lg border ${
            theme.card(isDark)} ${theme.textPrimary(isDark)}`}
        >
          <option value="next-2-weeks">Next 2 Weeks (Default)</option>
          <option value="next-month">Next Month</option>
          <option value="custom">Custom Date Range...</option>
        </select>
      )}
    </div>
  );
}

