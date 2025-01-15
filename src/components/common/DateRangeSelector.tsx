import React, { useState } from 'react';
import { format, subDays, subMonths, subYears, startOfYear, endOfYear, isSameDay } from 'date-fns';
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
  initialRange?: DateRange;
}

const predefinedRanges = [
  { label: '7 derniers jours', getValue: () => ({ startDate: subDays(new Date(), 7), endDate: new Date() }) },
  { label: '30 derniers jours', getValue: () => ({ startDate: subDays(new Date(), 30), endDate: new Date() }) },
  { label: '3 derniers mois', getValue: () => ({ startDate: subMonths(new Date(), 3), endDate: new Date() }) },
  { label: '6 derniers mois', getValue: () => ({ startDate: subMonths(new Date(), 6), endDate: new Date() }) },
  { label: '12 derniers mois', getValue: () => ({ startDate: subMonths(new Date(), 12), endDate: new Date() }) },
  { label: 'Année en cours', getValue: () => ({ startDate: startOfYear(new Date()), endDate: new Date() }) },
  { label: 'Année précédente', getValue: () => ({ 
    startDate: startOfYear(subYears(new Date(), 1)), 
    endDate: subYears(new Date(), 1)
  }) },
  { label: 'Personnalisé', getValue: () => ({ startDate: new Date(), endDate: new Date() }) }
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ onChange, initialRange }) => {
  // Détermine la plage initiale en fonction des props ou utilise une valeur par défaut
  const getInitialRange = () => {
    if (initialRange) {
      // Cherche si la plage initiale correspond à une plage prédéfinie
      const matchingRange = predefinedRanges.find(range => {
        const rangeValue = range.getValue();
        const isSameStart = isSameDay(rangeValue.startDate, initialRange.startDate);
        const isSameEnd = isSameDay(rangeValue.endDate, initialRange.endDate);
        return isSameStart && isSameEnd;
      });

      if (matchingRange) {
        return { range: initialRange, label: matchingRange.label };
      } else {
        return { range: initialRange, label: 'Personnalisé' };
      }
    }
    
    // Valeur par défaut : 30 derniers jours
    const defaultRange = predefinedRanges.find(r => r.label === '30 derniers jours')!;
    return { range: defaultRange.getValue(), label: defaultRange.label };
  };

  const initialState = getInitialRange();
  const [selectedRange, setSelectedRange] = useState(initialState.label);
  const [customRange, setCustomRange] = useState<DateRange>(initialState.range);
  const [isCustom, setIsCustom] = useState(initialState.label === 'Personnalisé');
  const [showCalendar, setShowCalendar] = useState<'start' | 'end' | null>(null);

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    const value = e.target.value;
    setSelectedRange(value);
    
    if (value === 'Personnalisé') {
      setIsCustom(true);
      setShowCalendar('start');
    } else {
      setIsCustom(false);
      setShowCalendar(null);
      const range = predefinedRanges.find(r => r.label === value)?.getValue() || customRange;
      onChange(range);
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', date: Date) => {
    let newRange: DateRange;
    
    if (type === 'start') {
      // Si la nouvelle date de début est après la date de fin actuelle,
      // on ajuste la date de fin pour être le même jour
      newRange = {
        startDate: date,
        endDate: date > customRange.endDate ? date : customRange.endDate
      };
    } else {
      // Si la nouvelle date de fin est avant la date de début actuelle,
      // on garde la date de fin actuelle
      if (date < customRange.startDate) {
        return;
      }
      newRange = {
        startDate: customRange.startDate,
        endDate: date
      };
    }
    
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
          onChange={handleRangeChange}
          className="inline-flex items-center justify-between rounded px-3 py-2 text-sm gap-2 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          onFocus={(e) => e.target.blur()} // Empêcher le focus du select sur mobile
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
                  disabled={[
                    { before: customRange.startDate }
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
