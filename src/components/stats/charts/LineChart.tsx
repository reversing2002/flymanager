import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  compareKey: string;
  colors?: Record<string | number, string>;
}

const LineChart: React.FC<LineChartProps> = ({ data, xKey, yKey, compareKey, colors }) => {
  // Group data by year
  const groupedData = data.reduce((acc, item) => {
    const year = item[compareKey];
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const getColorForYear = (year: string | number) => {
    if (colors && colors[year]) {
      return colors[year];
    }
    return year === new Date().getFullYear().toString() ? '#3b82f6' : '#9ca3af';
  };

  const chartData = {
    labels: groupedData[Object.keys(groupedData)[0]]?.map(item => item[xKey]) || [],
    datasets: Object.entries(groupedData).map(([year, items]) => ({
      label: year,
      data: items.map(item => item[yKey]),
      borderColor: getColorForYear(year),
      backgroundColor: getColorForYear(year),
      tension: 0.3,
    })),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `${value}h`,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return <Line data={chartData} options={options} />;
};

export default LineChart;