import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Eye, CreditCard, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import InvoiceDetailsModal from './InvoiceDetailsModal';
import { hasAnyGroup } from '../../lib/permissions';

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_hours?: number;
  total_amount?: number;
  pending_amount?: number;
}

const InstructorBillingList = () => {
  const { user } = useAuth();
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);

  // Vérifier si l'utilisateur est admin
  if (!hasAnyGroup(user, ['ADMIN'])) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        Accès non autorisé
      </div>
    );
  }

  // Récupérer la liste des instructeurs avec leurs statistiques de facturation
  const { data: instructors, isLoading } = useQuery({
    queryKey: ['instructorsBilling'],
    queryFn: async () => {
      // Récupérer les utilisateurs qui sont instructeurs via la RPC get_user_groups
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email
        `);

      if (usersError) throw usersError;

      // Pour chaque utilisateur, vérifier s'il est instructeur
      const instructors = await Promise.all(
        users.map(async (user) => {
          const { data: groups, error: groupsError } = await supabase
            .rpc('get_user_groups', { user_id: user.id });

          if (groupsError) throw groupsError;

          // Retourner l'utilisateur seulement s'il est instructeur
          if (groups?.includes('INSTRUCTOR')) {
            return user;
          }
          return null;
        })
      );

      // Filtrer les utilisateurs qui ne sont pas instructeurs
      const filteredInstructors = instructors.filter(Boolean);

      // Pour chaque instructeur, récupérer les statistiques de facturation
      const instructorsWithStats = await Promise.all(
        filteredInstructors.map(async (instructor) => {
          // Récupérer les vols validés
          const { data: flights, error: flightsError } = await supabase
            .from('flights')
            .select('instructor_fee')
            .eq('instructor_id', instructor.id)
            .eq('is_validated', true);

          if (flightsError) throw flightsError;

          // Calculer les totaux
          const totalAmount = flights?.reduce((sum, flight) => sum + (flight.instructor_fee || 0), 0) || 0;

          // Récupérer les factures en attente
          const { data: pendingInvoices, error: invoicesError } = await supabase
            .from('instructor_invoices')
            .select('amount')
            .eq('instructor_id', instructor.id)
            .eq('status', 'PENDING');

          if (invoicesError) throw invoicesError;

          const pendingAmount = pendingInvoices?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

          return {
            ...instructor,
            total_amount: totalAmount,
            pending_amount: pendingAmount,
            total_hours: flights?.length || 0,
          };
        })
      );

      return instructorsWithStats;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-slate-900">Facturation Instructeurs</h1>
          <p className="text-slate-600">Gestion des factures des instructeurs</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {instructors?.map((instructor) => (
              <div
                key={instructor.id}
                className="bg-white border rounded-lg p-4 hover:border-sky-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {instructor.first_name} {instructor.last_name}
                    </h3>
                    <p className="text-sm text-slate-600">{instructor.email}</p>
                  </div>
                  <button
                    onClick={() => setSelectedInstructorId(instructor.id)}
                    className="px-4 py-2 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                    <Clock className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-600">Heures de vol</p>
                      <p className="text-sm font-medium">{instructor.total_hours || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                    <CreditCard className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-600">Montant total</p>
                      <p className="text-sm font-medium">{instructor.total_amount?.toFixed(2) || '0.00'} €</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-600">En attente</p>
                      <p className="text-sm font-medium">{instructor.pending_amount?.toFixed(2) || '0.00'} €</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedInstructorId && (
        <InvoiceDetailsModal
          instructorId={selectedInstructorId}
          onClose={() => setSelectedInstructorId(null)}
        />
      )}
    </div>
  );
};

export default InstructorBillingList;
