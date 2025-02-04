import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import { calculatePendingBalance, calculateMemberBalance } from '../../lib/queries/accounts';
import { getMembersWithBalance } from '../../lib/queries/users';
import type { User } from '../../types/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Download, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF } from "../../utils/exportUtils";

interface MemberBalance {
  user: User;
  validatedBalance: number;
  pendingBalance: number;
}

type BalanceFilter = 'all' | 'negative' | 'positive';

const MemberBalancesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberBalance[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MemberBalance | 'name';
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const membersData = await getMembersWithBalance();
      const currentDate = format(new Date(), 'yyyy-MM-dd');

      const membersWithBalances = await Promise.all(
        membersData.map(async (member) => {
          const [validatedBalance, pendingBalance] = await Promise.all([
            calculateMemberBalance(member.id, currentDate),
            calculatePendingBalance(member.id, currentDate),
          ]);

          return {
            user: member,
            validatedBalance,
            pendingBalance,
          };
        })
      );

      setMembers(membersWithBalances);
    } catch (error) {
      console.error('Erreur lors du chargement des soldes:', error);
      toast.error('Erreur lors du chargement des soldes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Vérifier si l'utilisateur est admin
  if (!hasAnyGroup(user, ['ADMIN'])) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        Accès non autorisé
      </div>
    );
  }

  const handleSort = (key: keyof MemberBalance | 'name') => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleExportCSV = () => {
    const headers = ['Nom', 'Prénom', 'Solde validé', 'Solde en attente', 'Solde total'];
    const data = filteredMembers.map(member => [
      member.user.last_name,
      member.user.first_name,
      member.validatedBalance.toFixed(2),
      member.pendingBalance.toFixed(2),
      (member.validatedBalance + member.pendingBalance).toFixed(2)
    ]);

    exportToCSV({
      filename: 'soldes_membres',
      headers,
      data
    });
  };

  const handleExportPDF = () => {
    const headers = ['Nom', 'Prénom', 'Solde validé', 'Solde en attente', 'Solde total'];
    const data = filteredMembers.map(member => [
      member.user.last_name,
      member.user.first_name,
      `${member.validatedBalance.toFixed(2)} €`,
      `${member.pendingBalance.toFixed(2)} €`,
      `${(member.validatedBalance + member.pendingBalance).toFixed(2)} €`
    ]);

    exportToPDF({
      filename: 'soldes_membres',
      headers,
      data,
      title: 'Soldes des membres'
    });
  };

  const sortedMembers = [...members].sort((a, b) => {
    if (sortConfig.key === 'name') {
      const nameA = `${a.user.last_name} ${a.user.first_name}`.toLowerCase();
      const nameB = `${b.user.last_name} ${b.user.first_name}`.toLowerCase();
      return sortConfig.direction === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }

    const valueA = a[sortConfig.key];
    const valueB = b[sortConfig.key];
    
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortConfig.direction === 'asc'
        ? valueA - valueB
        : valueB - valueA;
    }
    
    return 0;
  });

  const filteredMembers = sortedMembers
    .filter((member) => {
      const searchStr = `${member.user.first_name} ${member.user.last_name}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      const totalBalance = member.validatedBalance + member.pendingBalance;
      const matchesBalanceFilter = balanceFilter === 'all' ||
        (balanceFilter === 'negative' && totalBalance < 0) ||
        (balanceFilter === 'positive' && totalBalance >= 0);
      
      return matchesSearch && matchesBalanceFilter;
    });

  const getSortIcon = (key: keyof MemberBalance | 'name') => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Soldes des membres</h1>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Rechercher un membre..."
            className="w-full md:w-1/3 px-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
            className="w-full md:w-auto px-4 py-2 border rounded-lg"
          >
            <option value="all">Tous les soldes</option>
            <option value="negative">Soldes négatifs</option>
            <option value="positive">Soldes positifs</option>
          </select>
          <div className="flex space-x-4">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FileText size={20} />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Download size={20} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th 
                className="text-left p-4 font-medium text-slate-600 cursor-pointer"
                onClick={() => handleSort('name')}
              >
                Nom {getSortIcon('name')}
              </th>
              <th 
                className="text-right p-4 font-medium text-slate-600 cursor-pointer"
                onClick={() => handleSort('validatedBalance')}
              >
                Solde validé {getSortIcon('validatedBalance')}
              </th>
              <th 
                className="text-right p-4 font-medium text-slate-600 cursor-pointer"
                onClick={() => handleSort('pendingBalance')}
              >
                Solde en attente {getSortIcon('pendingBalance')}
              </th>
              <th className="text-right p-4 font-medium text-slate-600">
                Solde total
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr 
                key={member.user.id} 
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="p-4">
                  {member.user.last_name} {member.user.first_name}
                </td>
                <td className={`p-4 text-right ${member.validatedBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {member.validatedBalance.toFixed(2)} €
                </td>
                <td className={`p-4 text-right ${member.pendingBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {member.pendingBalance.toFixed(2)} €
                </td>
                <td className={`p-4 text-right font-medium ${(member.validatedBalance + member.pendingBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(member.validatedBalance + member.pendingBalance).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MemberBalancesPage;
