import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface PaymentMethod {
  method: string;
  count: number;
  total: number;
}

interface RevenueTypeChartProps {
  data: PaymentMethod[];
}

export const RevenueTypeChart = ({ data }: RevenueTypeChartProps) => {
  const chartData = {
    labels: data?.map(d => getMethodLabel(d.method)) || [],
    datasets: [
      {
        data: data?.map(d => d.total) || [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
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
      title: {
        display: true,
        text: 'Répartition par méthode de paiement',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const method = data[context.dataIndex];
            return `${value.toFixed(2)} € (${method.count} transaction${method.count > 1 ? 's' : ''})`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-lg p-4">
      <Pie data={chartData} options={options} />
    </div>
  );
};

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    ACCOUNT: 'Compte club',
    CARD: 'Carte bancaire',
    TRANSFER: 'Virement',
    CHECK: 'Chèque',
    CASH: 'Espèces',
  };
  return labels[method] || method;
}
