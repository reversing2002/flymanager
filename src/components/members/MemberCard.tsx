import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail, Trash2 } from "lucide-react";
import type { User as UserType } from "../../types/database";
import type { Contribution } from "../../types/contribution";
import { isAfter, addMonths } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { getRoleLabel } from "../../lib/utils/roleUtils";
import { Role } from "../../types/roles";
import { supabase } from '../../lib/supabase';
import { adminClient } from "../../lib/supabase/adminClient";
import { toast } from "react-hot-toast";

interface MemberCardProps {
  member: UserType & { contributions?: Contribution[] };
  onDelete?: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onDelete }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdmin = hasAnyGroup(currentUser, ["ADMIN"]);
  const isInstructor = hasAnyGroup(currentUser, ["INSTRUCTOR"]);
  const canViewFinancials = isAdmin || isInstructor;

  // Vérifier si la cotisation est valide
  const isMembershipValid = React.useMemo(() => {
    if (!member.contributions?.length) return false;

    // Trier les cotisations par date de validité
    const sortedContributions = [...member.contributions].sort(
      (a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
    );

    const lastContribution = sortedContributions[0];
    if (!lastContribution) return false;

    // Une cotisation est valide pour 12 mois
    const validUntil = addMonths(new Date(lastContribution.valid_from), 12);
    return isAfter(validUntil, new Date());
  }, [member.contributions]);

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case "PILOT":
        return "bg-sky-100 text-sky-800";
      case "INSTRUCTOR":
        return "bg-green-100 text-green-800";
      case "ADMIN":
        return "bg-purple-100 text-purple-800";
      case "MECHANIC":
        return "bg-orange-100 text-orange-800";
      case "STUDENT":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDelete = async () => {
    try {
      // 1. Vérifier si l'utilisateur a des transactions ou des vols
      const { data: transactions, error: transactionsError } = await supabase
        .from('account_transactions')
        .select('id')
        .eq('user_id', member.id)
        .limit(1);

      if (transactionsError) throw transactionsError;

      if (transactions && transactions.length > 0) {
        toast.error('Impossible de supprimer ce membre car il a des transactions associées');
        return;
      }

      // Vérifier si l'utilisateur a des entrées comptables
      const { data: accountEntries, error: accountEntriesError } = await supabase
        .from('account_entries')
        .select('id')
        .eq('user_id', member.id)
        .limit(1);

      if (accountEntriesError) throw accountEntriesError;

      if (accountEntries && accountEntries.length > 0) {
        toast.error('Impossible de supprimer ce membre car il a des entrées comptables');
        return;
      }

      // Vérifier si l'utilisateur est assigné à des entrées comptables
      const { data: assignedEntries, error: assignedEntriesError } = await supabase
        .from('account_entries')
        .select('id')
        .eq('assigned_to_id', member.id)
        .limit(1);

      if (assignedEntriesError) throw assignedEntriesError;

      if (assignedEntries && assignedEntries.length > 0) {
        toast.error('Impossible de supprimer ce membre car il est assigné à des entrées comptables');
        return;
      }

      // 2. Supprimer les données associées dans l'ordre correct
      const deleteOperations = [
        // Suppression des données de communication
        supabase.from('dismissed_announcements').delete().eq('user_id', member.id),
        supabase.from('chat_room_members').delete().eq('user_id', member.id),
        supabase.from('chat_messages').delete().eq('user_id', member.id),
        supabase.from('private_messages').delete().eq('sender_id', member.id),
        supabase.from('private_messages').delete().eq('recipient_id', member.id),
        
        // Suppression des données de qualifications
        supabase.from('pilot_licenses').delete().eq('user_id', member.id),
        supabase.from('medical_certifications').delete().eq('user_id', member.id),
        supabase.from('user_badges').delete().eq('user_id', member.id),
        
        // Suppression des données d'activité
        supabase.from('availabilities').delete().eq('user_id', member.id),
        supabase.from('aircraft_remark_responses').delete().eq('user_id', member.id),
        supabase.from('aircraft_remarks').delete().eq('user_id', member.id),
        
        // Suppression des appartenances aux groupes
        supabase.from('user_group_memberships').delete().eq('user_id', member.id),
        supabase.from('club_members').delete().eq('user_id', member.id),
        
        // Enfin, suppression de l'utilisateur lui-même
        supabase.from('users').delete().eq('id', member.id)
      ];

      // Exécuter toutes les opérations de suppression
      const results = await Promise.all(deleteOperations);
      
      // Vérifier s'il y a eu des erreurs
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Erreurs lors de la suppression:', errors);
        throw new Error('Erreur lors de la suppression du membre');
      }

      // Supprimer l'utilisateur de auth.users
      const { error: authError } = await adminClient.auth.admin.deleteUser(member.id);
      if (authError) {
        console.error('Erreur lors de la suppression de auth.users:', authError);
        throw authError;
      }

      toast.success('Membre supprimé avec succès');
      onDelete?.();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du membre');
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Empêcher la navigation si on clique sur le bouton de suppression
    if ((e.target as HTMLElement).closest('.delete-button')) {
      e.stopPropagation();
      return;
    }
    navigate(`/members/${member.id}`);
  };

  return (
    <div
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={handleCardClick}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              {member.image_url ? (
                <img
                  src={member.image_url}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-slate-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {`${member.first_name} ${member.last_name}`}
              </h3>
              <div className="flex flex-wrap gap-2">
                {member.roles?.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      role
                    )}`}
                  >
                    {getRoleLabel(role)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isMembershipValid && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                Cotisation expirée
              </span>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="delete-button p-2 rounded-full hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                </button>

                {showDeleteDialog && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                      <h3 className="text-lg font-semibold mb-2">Confirmer la suppression</h3>
                      <p className="text-gray-600 mb-4">
                        Êtes-vous sûr de vouloir supprimer {member.first_name} {member.last_name} ?
                        Cette action est irréversible.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowDeleteDialog(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleDelete}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {member.phone && (
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Phone className="h-4 w-4" />
              <span>{member.phone}</span>
            </div>
          )}
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Mail className="h-4 w-4" />
            <span>{member.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
