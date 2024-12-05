import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Wrench, AlertTriangle, Clock, Calendar, RotateCcw, ChevronLeft, AlertCircle } from 'lucide-react';
import { format, addDays, isValid, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Aircraft } from '../types/database';
import type { MaintenanceOperation, MaintenanceHistory } from '../types/maintenance';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import MaintenanceOperationModal from '../components/maintenance/MaintenanceOperationModal';
import MaintenanceHistoryList from '../components/maintenance/MaintenanceHistoryList';

const MaintenancePage = () => {
  const { id: aircraftId } = useParams<{ id: string }>();
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [operations, setOperations] = useState<MaintenanceOperation[]>([]);
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<MaintenanceOperation | null>(null);

  useEffect(() => {
    loadData();
  }, [aircraftId]);

  const loadData = async () => {
    if (!aircraftId) return;

    try {
      const [aircraftData, operationsData, historyData] = await Promise.all([
        // Load aircraft details
        supabase
          .from('aircraft')
          .select('*')
          .eq('id', aircraftId)
          .single(),

        // Load maintenance operations
        supabase
          .from('aircraft_maintenance_operations')
          .select(`
            *,
            maintenanceType:maintenance_type_id (*)
          `)
          .eq('aircraft_id', aircraftId)
          .order('next_due_at', { ascending: true }),

        // Load maintenance history
        supabase
          .from('maintenance_history')
          .select(`
            *,
            maintenanceType:maintenance_type_id (*),
            performer:performed_by (
              firstName:first_name,
              lastName:last_name
            )
          `)
          .eq('aircraft_id', aircraftId)
          .order('performed_at', { ascending: false })
      ]);

      if (aircraftData.error) throw aircraftData.error;
      if (operationsData.error) throw operationsData.error;
      if (historyData.error) throw historyData.error;

      setAircraft(aircraftData.data);
      setOperations(operationsData.data);
      setHistory(historyData.data);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'Pp', { locale: fr }) : 'Date invalide';
  };

  const getMaintenanceStatus = (operation: MaintenanceOperation) => {
    if (!operation.nextDueAt && !operation.nextDueHours && !operation.nextDueCycles) {
      return { status: 'unknown', message: 'Échéance non définie' };
    }

    const now = new Date();
    let isOverdue = false;
    let isUpcoming = false;
    let message = '';

    // Check calendar-based maintenance
    if (operation.nextDueAt) {
      const dueDate = new Date(operation.nextDueAt);
      const daysUntilDue = differenceInDays(dueDate, now);
      
      if (daysUntilDue < 0) {
        isOverdue = true;
        message = `En retard de ${Math.abs(daysUntilDue)} jours`;
      } else if (daysUntilDue <= 30) {
        isUpcoming = true;
        message = `Dans ${daysUntilDue} jours`;
      } else {
        message = `Dans ${daysUntilDue} jours`;
      }
    }

    // Check hours-based maintenance
    if (operation.nextDueHours && aircraft?.totalFlightHours) {
      const hoursRemaining = operation.nextDueHours - aircraft.totalFlightHours;
      
      if (hoursRemaining < 0) {
        isOverdue = true;
        message = `En retard de ${Math.abs(hoursRemaining).toFixed(1)}h`;
      } else if (hoursRemaining <= 10) {
        isUpcoming = true;
        message = `Dans ${hoursRemaining.toFixed(1)}h`;
      } else {
        message = `Dans ${hoursRemaining.toFixed(1)}h`;
      }
    }

    // Check cycles-based maintenance
    if (operation.nextDueCycles && aircraft?.totalCycles) {
      const cyclesRemaining = operation.nextDueCycles - aircraft.totalCycles;
      
      if (cyclesRemaining < 0) {
        isOverdue = true;
        message = `En retard de ${Math.abs(cyclesRemaining)} cycles`;
      } else if (cyclesRemaining <= 10) {
        isUpcoming = true;
        message = `Dans ${cyclesRemaining} cycles`;
      } else {
        message = `Dans ${cyclesRemaining} cycles`;
      }
    }

    return {
      status: isOverdue ? 'overdue' : isUpcoming ? 'upcoming' : 'ok',
      message
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-50 text-red-800 border-red-100';
      case 'upcoming':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'ok':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-100';
    }
  };

  const handleOperationComplete = async (operation: MaintenanceOperation) => {
    try {
      // Add to history
      const { error: historyError } = await supabase
        .from('maintenance_history')
        .insert({
          aircraft_id: aircraftId,
          maintenance_type_id: operation.maintenanceTypeId,
          performed_at: new Date().toISOString(),
          hours: aircraft?.totalFlightHours,
          cycles: aircraft?.totalCycles,
          comments: operation.comments,
          performed_by: operation.performedBy
        });

      if (historyError) throw historyError;

      // Update operation
      const { error: operationError } = await supabase
        .from('aircraft_maintenance_operations')
        .update({
          last_performed_at: new Date().toISOString(),
          hours_at_maintenance: aircraft?.totalFlightHours,
          cycles_at_maintenance: aircraft?.totalCycles,
          next_due_at: operation.maintenanceType?.type === 'CALENDAR' 
            ? addDays(new Date(), operation.maintenanceType.intervalValue).toISOString()
            : null,
          next_due_hours: operation.maintenanceType?.type === 'HOURS'
            ? (aircraft?.totalFlightHours || 0) + operation.maintenanceType.intervalValue
            : null,
          next_due_cycles: operation.maintenanceType?.type === 'CYCLES'
            ? (aircraft?.totalCycles || 0) + operation.maintenanceType.intervalValue
            : null
        })
        .eq('id', operation.id);

      if (operationError) throw operationError;

      toast.success('Maintenance effectuée');
      loadData();
    } catch (error) {
      console.error('Error completing maintenance:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>Appareil non trouvé</p>
        </div>
      </div>
    );
  }

  // Count maintenance alerts
  const maintenanceAlerts = operations.reduce(
    (acc, op) => {
      const status = getMaintenanceStatus(op).status;
      if (status === 'overdue') acc.overdue++;
      else if (status === 'upcoming') acc.upcoming++;
      return acc;
    },
    { overdue: 0, upcoming: 0 }
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          to="/aircraft"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux appareils
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Maintenance - {aircraft.registration}
            </h1>
            <p className="text-slate-600">{aircraft.name}</p>
          </div>

          <button
            onClick={() => setShowOperationModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
          >
            <Wrench className="h-4 w-4" />
            <span>Nouvelle opération</span>
          </button>
        </div>
      </div>

      {(maintenanceAlerts.overdue > 0 || maintenanceAlerts.upcoming > 0) && (
        <div className="mb-6">
          {maintenanceAlerts.overdue > 0 && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5" />
              <p>
                {maintenanceAlerts.overdue} maintenance{maintenanceAlerts.overdue > 1 ? 's' : ''} en retard
              </p>
            </div>
          )}
          {maintenanceAlerts.upcoming > 0 && (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>
                {maintenanceAlerts.upcoming} maintenance{maintenanceAlerts.upcoming > 1 ? 's' : ''} à prévoir
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-600">Heures totales</p>
                <p className="text-2xl font-bold">{aircraft.totalFlightHours?.toFixed(1)}h</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-600">Cycles totaux</p>
                <p className="text-2xl font-bold">{aircraft.totalCycles || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-600">Prochaine maintenance</p>
                <p className="text-2xl font-bold">
                  {aircraft.nextMaintenanceDate
                    ? formatDate(aircraft.nextMaintenanceDate)
                    : 'Non définie'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6">Opérations de maintenance</h2>

            <div className="space-y-4">
              {operations.map((operation) => {
                const { status, message } = getMaintenanceStatus(operation);
                return (
                  <div
                    key={operation.id}
                    className={`p-4 rounded-lg border ${getStatusColor(status)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{operation.maintenanceType?.name}</h3>
                        <div className="space-y-1 mt-1">
                          <p className="text-sm">
                            Dernière: {formatDate(operation.lastPerformedAt)}
                          </p>
                          <p className="text-sm font-medium">
                            Prochaine: {message}
                          </p>
                          {operation.maintenanceType?.type === 'HOURS' && (
                            <p className="text-sm">
                              Intervalle: {operation.maintenanceType.intervalValue}h
                            </p>
                          )}
                          {operation.maintenanceType?.type === 'CALENDAR' && (
                            <p className="text-sm">
                              Intervalle: {operation.maintenanceType.intervalValue} jours
                            </p>
                          )}
                          {operation.maintenanceType?.type === 'CYCLES' && (
                            <p className="text-sm">
                              Intervalle: {operation.maintenanceType.intervalValue} cycles
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedOperation(operation)}
                        className="px-3 py-1 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg"
                      >
                        Effectuer
                      </button>
                    </div>
                  </div>
                );
              })}

              {operations.length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  Aucune opération de maintenance programmée
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <MaintenanceHistoryList history={history} />
        </div>
      </div>

      {showOperationModal && (
        <MaintenanceOperationModal
          aircraftId={aircraftId}
          onClose={() => setShowOperationModal(false)}
          onSuccess={loadData}
        />
      )}

      {selectedOperation && (
        <MaintenanceOperationModal
          aircraftId={aircraftId}
          operation={selectedOperation}
          onClose={() => setSelectedOperation(null)}
          onSuccess={() => {
            handleOperationComplete(selectedOperation);
            setSelectedOperation(null);
          }}
        />
      )}
    </div>
  );
};

export default MaintenancePage;