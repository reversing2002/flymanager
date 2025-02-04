import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfYear, endOfYear, subMonths, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plane,
  Users,
  Calendar,
  CreditCard,
  AlertCircle,
  BarChart as BarChartIcon,
  Clock,
  FileText,
  Activity,
  Heart,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import UpcomingEvents from '../events/UpcomingEvents';
import { hasAnyGroup } from '../../lib/permissions';

import clsx from 'clsx';
import MonthlyAccountSummary from './tables/MonthlyAccountSummary';
import MonthlyAircraftHours from './tables/MonthlyAircraftHours';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est admin
  if (!hasAnyGroup(user, ['ADMIN'])) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        Accès non autorisé
      </div>
    );
  }

  // Stats financières
  const { data: financialStats } = useQuery({
    queryKey: ['adminFinancialStats'],
    queryFn: async () => {
      const currentDate = new Date();
      const startDate = startOfYear(currentDate);
      const endDate = endOfYear(currentDate);

      const { data, error } = await supabase.rpc('get_financial_stats', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (error) throw error;
      return data;
    },
  });

  // Stats des membres
  const { data: memberStats } = useQuery({
    queryKey: ['adminMemberStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_member_stats');
      if (error) throw error;
      return data;
    },
  });

  // Stats de la flotte
  const { data: fleetStats } = useQuery({
    queryKey: ['adminFleetStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_maintenance_stats');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord administrateur</h1>
        <p className="text-slate-600">Vue d'ensemble de l'activité du club</p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-6 bg-gradient-to-br from-white to-slate-50 shadow-sm border border-slate-100">
          <div className="flex flex-col">
            <h3 className="text-lg font-medium text-slate-800">Membres actifs</h3>
            <p className="text-sm text-slate-500">Membres à jour de cotisation</p>
            <div className="mt-4 text-2xl font-bold">{memberStats?.active_members || '0'}</div>
          </div>
        </div>

        
      </div>

      {/* Tableau des sommes mensuelles par type d'entrée */}
      <div className="col-span-full">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Résumé mensuel des comptes</h2>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 max-h-[600px] overflow-y-auto">
            <MonthlyAccountSummary />
            <MonthlyAircraftHours />
          </div>
        </div>
      </div>

      {/* Alertes et notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-slate-600" />
            Alertes membres
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {/* Adhésions expirant bientôt */}
            {memberStats?.expiring_memberships?.map(member => (
              <div key={member.id} className="p-4 bg-amber-50 text-amber-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>
                    La cotisation de {member.first_name} {member.last_name} expire le{' '}
                    {format(new Date(member.expiry_date), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            ))}

            {/* Qualifications expirées et à renouveler */}
            {memberStats?.qualification_stats?.expiring_details?.map(qual => (
              <div key={`${qual.pilot_id}-${qual.qualification}`} className="p-4 bg-amber-50 text-amber-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    La qualification {qual.qualification} de {qual.first_name} {qual.last_name} expire le{' '}
                    {format(new Date(qual.expiry_date), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            ))}

            {memberStats?.qualification_stats?.expired > 0 && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    {memberStats.qualification_stats.expired} qualification{memberStats.qualification_stats.expired > 1 ? 's' : ''} expirée{memberStats.qualification_stats.expired > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Visites médicales détaillées */}
            {memberStats?.medical_stats?.expiring_details?.map(medical => (
              <div key={medical.pilot_id} className="p-4 bg-amber-50 text-amber-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>
                    La visite médicale de {medical.first_name} {medical.last_name} expire le{' '}
                    {format(new Date(medical.expiry_date), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            ))}

            {memberStats?.medical_stats?.expired > 0 && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>
                    {memberStats.medical_stats.expired} visite{memberStats.medical_stats.expired > 1 ? 's' : ''} médicale{memberStats.medical_stats.expired > 1 ? 's' : ''} expirée{memberStats.medical_stats.expired > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-600" />
            État de la flotte
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {fleetStats?.aircraft_stats?.filter(aircraft => aircraft.status !== 'UNAVAILABLE').map(aircraft => (
              <div 
                key={aircraft.id} 
                className="p-4 bg-white border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/aircraft/${aircraft.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={clsx(
                      "w-2 h-2 rounded-full",
                      {
                        'bg-red-500': aircraft.maintenance_status === 'OVERDUE',
                        'bg-orange-500': aircraft.maintenance_status === 'URGENT',
                        'bg-yellow-500': aircraft.maintenance_status === 'WARNING',
                        'bg-green-500': aircraft.maintenance_status === 'OK',
                      }
                    )} />
                    <Plane className="h-4 w-4 text-slate-600" />
                    <span className="font-medium">{aircraft.registration}</span>
                    <span className="text-sm text-slate-500">{aircraft.name} ({aircraft.model})</span>
                    <span className={clsx(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      aircraft.status === "AVAILABLE" && "bg-emerald-100 text-emerald-800",
                      aircraft.status === "MAINTENANCE" && "bg-amber-100 text-amber-800"
                    )}>
                      {aircraft.status === "AVAILABLE" && "Disponible"}
                      {aircraft.status === "MAINTENANCE" && "En maintenance"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600">
                      {aircraft.total_flights_30d || 0} vol{(aircraft.total_flights_30d || 0) > 1 ? 's' : ''} / 30j
                    </span>
                    <span className="text-sm text-slate-600">
                      {aircraft.total_hours_30d ? aircraft.total_hours_30d.toFixed(1) : '0.0'}h de vol / 30j
                    </span>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {aircraft.maintenance_status === 'OVERDUE' && (
                    <div className="text-sm text-red-600">
                      Maintenance dépassée ({aircraft.hours_before_maintenance}h)
                    </div>
                  )}
                  {aircraft.maintenance_status === 'URGENT' && (
                    <div className="text-sm text-orange-600">
                      Maintenance urgente requise ({aircraft.hours_before_maintenance}h)
                    </div>
                  )}
                  {aircraft.maintenance_status === 'WARNING' && (
                    <div className="text-sm text-yellow-600">
                      Maintenance recommandée bientôt ({aircraft.hours_before_maintenance}h)
                    </div>
                  )}
                  {aircraft.maintenance_status === 'OK' && (
                    <div className="text-sm text-green-600">
                      {aircraft.hours_before_maintenance}h de potentiel restant
                    </div>
                  )}
                  <div className="text-xs text-slate-500">
                    {aircraft.last_maintenance ? 
                      `Dernière maintenance le ${format(new Date(aircraft.last_maintenance), 'dd/MM/yyyy', { locale: fr })}` :
                      'Aucune maintenance enregistrée'
                    }
                    {aircraft.last_flight && (
                      <span className="ml-4">
                        Dernier vol le {format(new Date(aircraft.last_flight), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Événements à venir */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-600" />
          Événements à venir
        </h2>
        <UpcomingEvents />
      </div>
    </div>
  );
};

export default AdminDashboard;
