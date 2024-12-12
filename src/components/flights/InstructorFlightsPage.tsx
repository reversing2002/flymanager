import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Download, Calendar, Clock, CreditCard, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getInstructorFlights } from '../../lib/queries/flights';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import CreateInvoiceModal from '../billing/CreateInvoiceModal';
import InstructorInvoiceList from '../billing/InstructorInvoiceList';

const InstructorFlightsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [validationFilter, setValidationFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'flights' | 'invoices'>('flights');

  const { data: flights = [], isLoading } = useQuery({
    queryKey: ['instructorFlights', user?.id, dateRange],
    queryFn: () => getInstructorFlights(user!.id, dateRange.start, dateRange.end),
    enabled: !!user?.id,
  });

  const handleQuickDateSelect = (months: number) => {
    const date = subMonths(new Date(), months);
    setDateRange({
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd'),
    });
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ['Date', 'Élève', 'Appareil', 'Durée', 'Montant', 'Statut'].join(';'),
        ...filteredFlights.map(flight => [
          format(new Date(flight.date), 'dd/MM/yyyy'),
          `${flight.student.first_name} ${flight.student.last_name}`,
          flight.aircraft.registration,
          `${Math.floor(flight.duration / 60)}h${flight.duration % 60}`,
          flight.instructor_fee?.toFixed(2) || '0.00',
          flight.is_validated ? 'Validé' : 'En attente'
        ].join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `vols-instruction-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export réussi');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const filteredFlights = useMemo(() => {
    return flights.filter(flight => {
      // Search filter
      const searchMatch = search === '' || 
        `${flight.student.first_name} ${flight.student.last_name}`.toLowerCase().includes(search.toLowerCase());

      // Validation filter
      const validationMatch = validationFilter === 'all' ||
        (validationFilter === 'validated' && flight.is_validated) ||
        (validationFilter === 'pending' && !flight.is_validated);

      return searchMatch && validationMatch;
    });
  }, [flights, search, validationFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const validatedFlights = filteredFlights.filter(f => f.is_validated);
    const totalDuration = validatedFlights.reduce((sum, f) => sum + f.duration, 0);
    const totalAmount = validatedFlights.reduce((sum, f) => sum + (f.instructor_fee || 0), 0);
    const pendingAmount = filteredFlights
      .filter(f => !f.is_validated)
      .reduce((sum, f) => sum + (f.instructor_fee || 0), 0);
    const billableAmount = validatedFlights
      .filter(f => !f.instructor_invoice_id)
      .reduce((sum, f) => sum + (f.instructor_fee || 0), 0);

    return {
      totalDuration,
      totalAmount,
      pendingAmount,
      billableAmount,
      flightCount: validatedFlights.length
    };
  }, [filteredFlights]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Vols d'instruction</h1>
        <p className="text-slate-600">Suivi de vos heures d'instruction et revenus</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('flights')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'flights'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Vols
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'invoices'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Factures
          </button>
        </nav>
      </div>

      {activeTab === 'flights' ? (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Heures validées</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {Math.floor(stats.totalDuration / 60)}h{stats.totalDuration % 60}
                  </p>
                </div>
                <div className="p-2 bg-sky-50 rounded-lg">
                  <Clock className="h-6 w-6 text-sky-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Vols validés</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.flightCount}
                  </p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Montant validé</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    {stats.totalAmount.toFixed(2)} €
                  </p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CreditCard className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">En attente</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">
                    {stats.pendingAmount.toFixed(2)} €
                  </p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Reste à facturer</p>
                  <p className="mt-2 text-2xl font-bold text-sky-600">
                    {stats.billableAmount.toFixed(2)} €
                  </p>
                </div>
                <div className="p-2 bg-sky-50 rounded-lg">
                  <CreditCard className="h-6 w-6 text-sky-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and search */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
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
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  disabled={stats.billableAmount <= 0}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    stats.billableAmount > 0
                      ? 'bg-sky-600 hover:bg-sky-700'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Créer une facture</span>
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Période
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuickDateSelect(0)}
                        className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-200 hover:border-slate-300"
                      >
                        Ce mois
                      </button>
                      <button
                        onClick={() => handleQuickDateSelect(1)}
                        className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-200 hover:border-slate-300"
                      >
                        Mois dernier
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Du
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Au
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Validation
                    </label>
                    <select
                      value={validationFilter}
                      onChange={(e) => setValidationFilter(e.target.value)}
                      className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    >
                      <option value="all">Tous</option>
                      <option value="validated">Validés</option>
                      <option value="pending">En attente</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flight list */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-4 font-medium text-slate-600">Date</th>
                    <th className="text-left p-4 font-medium text-slate-600">Élève</th>
                    <th className="text-left p-4 font-medium text-slate-600">Appareil</th>
                    <th className="text-right p-4 font-medium text-slate-600">Durée</th>
                    <th className="text-right p-4 font-medium text-slate-600">Montant</th>
                    <th className="text-center p-4 font-medium text-slate-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredFlights.map((flight) => (
                    <tr key={flight.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        {format(new Date(flight.date), 'dd MMMM yyyy', { locale: fr })}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">
                          {flight.student.first_name} {flight.student.last_name}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">
                          {flight.aircraft.registration}
                        </div>
                        <div className="text-sm text-slate-500">
                          {flight.aircraft.name}
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {Math.floor(flight.duration / 60)}h{flight.duration % 60}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {(flight.instructor_fee || 0).toFixed(2)} €
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            flight.is_validated
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {flight.is_validated ? 'Validé' : 'En attente'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filteredFlights.length && (
                <div className="text-center py-12">
                  <p className="text-slate-600">Aucun vol d'instruction trouvé</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <InstructorInvoiceList />
      )}

      {showInvoiceModal && (
        <CreateInvoiceModal
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={() => {
            setShowInvoiceModal(false);
            setActiveTab('invoices');
          }}
          validatedFlights={flights.filter(f => f.is_validated && !f.instructor_invoice_id)}
        />
      )}
    </div>
  );
};

export default InstructorFlightsPage;
