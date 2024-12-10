import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Download, Mail, Phone, CreditCard, AlertTriangle } from 'lucide-react';
import { getMembersWithBalance } from '../../lib/queries/accounts';
import { formatAmount } from '../../lib/utils/formatters';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const AccountStatusPage = () => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    balanceType: 'all', // 'all', 'positive', 'negative'
    validationStatus: 'all', // 'all', 'validated', 'pending'
  });

  const { data: members, isLoading, error } = useQuery({
    queryKey: ['membersWithBalance'],
    queryFn: getMembersWithBalance,
  });

  const handleExport = () => {
    try {
      const csvContent = [
        ['Nom', 'Prénom', 'Email', 'Téléphone', 'Solde validé', 'Solde en attente'].join(';'),
        ...filteredMembers.map(member => [
          member.lastName,
          member.firstName,
          member.email,
          member.phone || '',
          member.validatedBalance.toFixed(2),
          member.pendingBalance.toFixed(2),
        ].join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `etats-comptes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export réussi');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const filteredMembers = members?.filter(member => {
    // Filtre de recherche
    const searchMatch = 
      search === '' ||
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      member.phone?.includes(search);

    // Filtre de solde
    let balanceMatch = true;
    if (filters.balanceType === 'positive') {
      balanceMatch = member.validatedBalance > 0;
    } else if (filters.balanceType === 'negative') {
      balanceMatch = member.validatedBalance < 0;
    }

    // Filtre de validation
    let validationMatch = true;
    if (filters.validationStatus === 'validated') {
      validationMatch = member.pendingBalance === 0;
    } else if (filters.validationStatus === 'pending') {
      validationMatch = member.pendingBalance !== 0;
    }

    return searchMatch && balanceMatch && validationMatch;
  }) || [];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-12 bg-slate-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>Une erreur est survenue lors du chargement des données</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">État des comptes</h1>
        <p className="text-slate-600">Vue d'ensemble des soldes des membres</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un membre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filtres</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  État du solde
                </label>
                <select
                  value={filters.balanceType}
                  onChange={(e) => setFilters(prev => ({ ...prev, balanceType: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="all">Tous les soldes</option>
                  <option value="positive">Solde positif</option>
                  <option value="negative">Solde négatif</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Statut de validation
                </label>
                <select
                  value={filters.validationStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, validationStatus: e.target.value }))}
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="all">Tous</option>
                  <option value="validated">Validés uniquement</option>
                  <option value="pending">Avec opérations en attente</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-4 font-medium text-slate-600">Membre</th>
                <th className="text-left p-4 font-medium text-slate-600">Contact</th>
                <th className="text-right p-4 font-medium text-slate-600">Solde validé</th>
                <th className="text-right p-4 font-medium text-slate-600">En attente</th>
                <th className="text-right p-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">
                      {member.firstName} {member.lastName}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4" />
                        <span>{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`font-medium ${
                      member.validatedBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {member.validatedBalance.toFixed(2)} €
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {member.pendingBalance !== 0 && (
                      <span className="text-amber-600 font-medium">
                        {member.pendingBalance.toFixed(2)} €
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      to={`/accounts?member=${member.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Détails</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">Aucun membre trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountStatusPage;