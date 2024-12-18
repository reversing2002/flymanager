import React, { useState } from 'react';
import { format, subDays, subMonths, subYears, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangeSelectorProps {
  onChange: (range: DateRange) => void;
}

const predefinedRanges = [
  { label: '7 derniers jours', getValue: () => ({ startDate: subDays(new Date(), 7), endDate: new Date() }) },
  { label: '30 derniers jours', getValue: () => ({ startDate: subDays(new Date(), 30), endDate: new Date() }) },
  { label: '3 derniers mois', getValue: () => ({ startDate: subMonths(new Date(), 3), endDate: new Date() }) },
  { label: '6 derniers mois', getValue: () => ({ startDate: subMonths(new Date(), 6), endDate: new Date() }) },
  { label: 'Année en cours', getValue: () => ({ startDate: startOfYear(new Date()), endDate: endOfYear(new Date()) }) },
  { label: 'Année précédente', getValue: () => ({ 
    startDate: startOfYear(subYears(new Date(), 1)), 
    endDate: endOfYear(subYears(new Date(), 1)) 
  }) },
  { label: 'Personnalisé', getValue: () => ({ startDate: new Date(), endDate: new Date() }) }
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ onChange }) => {
  const [selectedRange, setSelectedRange] = useState('30 derniers jours');
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: new Date(),
    endDate: new Date()
  });
  const [isCustom, setIsCustom] = useState(false);
  const [showCalendar, setShowCalendar] = useState<'start' | 'end' | null>(null);

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
    if (value === 'Personnalisé') {
      setIsCustom(true);
      onChange(customRange);
    } else {
      setIsCustom(false);
      const range = predefinedRanges.find(r => r.label === value)?.getValue() || customRange;
      onChange(range);
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', date: Date) => {
    const newRange = {
      ...customRange,
      [type === 'start' ? 'startDate' : 'endDate']: date
    };
    setCustomRange(newRange);
    onChange(newRange);
    setShowCalendar(null);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-white rounded-lg shadow">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-gray-500" />
        <select
          value={selectedRange}
          onChange={(e) => handleRangeChange(e.target.value)}
          className="inline-flex items-center justify-between rounded px-3 py-2 text-sm gap-2 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        >
          {predefinedRanges.map((range) => (
            <option key={range.label} value={range.label}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {isCustom && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <button
              onClick={() => setShowCalendar(showCalendar === 'start' ? null : 'start')}
              className="inline-flex items-center justify-between rounded px-3 py-2 text-sm gap-2 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {format(customRange.startDate, 'dd/MM/yyyy', { locale: fr })}
              <CalendarIcon className="h-4 w-4" />
            </button>
            {showCalendar === 'start' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <DayPicker
                  mode="single"
                  selected={customRange.startDate}
                  onSelect={(date) => date && handleCustomDateChange('start', date)}
                  locale={fr}
                />
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowCalendar(showCalendar === 'end' ? null : 'end')}
              className="inline-flex items-center justify-between rounded px-3 py-2 text-sm gap-2 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {format(customRange.endDate, 'dd/MM/yyyy', { locale: fr })}
              <CalendarIcon className="h-4 w-4" />
            </button>
            {showCalendar === 'end' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <DayPicker
                  mode="single"
                  selected={customRange.endDate}
                  onSelect={(date) => date && handleCustomDateChange('end', date)}
                  locale={fr}
                  fromDate={customRange.startDate}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
