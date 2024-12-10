import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  data: any[];
  nameKey: string;
  valueKey: string;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
];

const PieChart: React.FC<PieChartProps> = ({ data, nameKey, valueKey }) => {
  const chartData = {
    labels: data.map(item => item[nameKey]),
    datasets: [
      {
        data: data.map(item => item[valueKey]),
        backgroundColor: COLORS,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label}: ${context.formattedValue}h`,
        },
      },
    },
  };

  return <Pie data={chartData} options={options} />;
};

export default PieChart;