import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { startOfYear, endOfYear, subMonths, startOfMonth, endOfMonth, subYears } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface PeriodFilterProps {
  selectedPeriod: string;
  onPeriodChange: (period: string, dateRange: DateRange) => void;
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const handlePeriodChange = (event: { target: { value: string } }) => {
    const period = event.target.value;
    const now = new Date();
    let dateRange: DateRange;

    switch (period) {
      case 'currentYear':
        dateRange = {
          startDate: startOfYear(now),
          endDate: endOfYear(now),
        };
        break;
      case 'lastYear':
        const lastYear = subYears(now, 1);
        dateRange = {
          startDate: startOfYear(lastYear),
          endDate: endOfYear(lastYear),
        };
        break;
      case 'last2Years':
        dateRange = {
          startDate: startOfYear(subYears(now, 2)),
          endDate: endOfYear(now),
        };
        break;
      case 'last3Years':
        dateRange = {
          startDate: startOfYear(subYears(now, 3)),
          endDate: endOfYear(now),
        };
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        dateRange = {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth),
        };
        break;
      case 'last3Months':
        dateRange = {
          startDate: startOfMonth(subMonths(now, 3)),
          endDate: endOfMonth(now),
        };
        break;
      case 'last6Months':
        dateRange = {
          startDate: startOfMonth(subMonths(now, 6)),
          endDate: endOfMonth(now),
        };
        break;
      case 'currentMonth':
        dateRange = {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
        break;
      case 'all':
      default:
        dateRange = {
          startDate: new Date(0),
          endDate: now,
        };
        break;
    }

    onPeriodChange(period, dateRange);
  };

  return (
    <Box sx={{ minWidth: 200, mb: 2 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Période</InputLabel>
        <Select
          value={selectedPeriod}
          label="Période"
          onChange={handlePeriodChange}
        >
          <MenuItem value="currentYear">Année en cours</MenuItem>
          <MenuItem value="lastYear">Année précédente</MenuItem>
          <MenuItem value="last2Years">2 dernières années</MenuItem>
          <MenuItem value="last3Years">3 dernières années</MenuItem>
          <MenuItem value="currentMonth">Mois en cours</MenuItem>
          <MenuItem value="lastMonth">Mois précédent</MenuItem>
          <MenuItem value="last3Months">3 derniers mois</MenuItem>
          <MenuItem value="last6Months">6 derniers mois</MenuItem>
          <MenuItem value="all">Toutes les périodes</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};
