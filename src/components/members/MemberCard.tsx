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
  const hasFullAccess = isAdmin || isInstructor;

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

  const formatEmail = (email: string | null, hasFullAccess: boolean) => {
    if (!email) return "Non renseigné";
    if (hasFullAccess) {
      return email;
    }
    // Masquer l'email en ne montrant que le domaine
    const [localPart, domain] = email.split('@');
    return `***@${domain}`;
  };

  const handleDelete = async () => {
    if (!member.id) return;

    try {
      // Supprimer l'utilisateur de Supabase Auth
      if (member.auth_id) {
        const { error: authError } = await adminClient.auth.admin.deleteUser(
          member.auth_id
        );
        if (authError) throw authError;
      }

      // Supprimer l'utilisateur de la base de données
      const { error: dbError } = await supabase
        .from("users")
        .delete()
        .eq("id", member.id);

      if (dbError) throw dbError;

      toast.success("Membre supprimé avec succès");
      onDelete?.();
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Erreur lors de la suppression du membre");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0"> 
          <div className="flex items-center space-x-3 mb-2">
            <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
              {member?.image_url ? (
                <img
                  src={member.image_url}
                  alt={`Photo de ${member.first_name} ${member.last_name}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.classList.add('bg-gray-100');
                    e.currentTarget.parentElement?.classList.add('bg-gray-100');
                  }}
                />
              ) : (
                <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0"> 
              <h3 
                className="text-lg font-medium text-gray-900 hover:text-blue-600 cursor-pointer truncate"
                onClick={() => navigate(`/members/${member.id}`)}
                title={`${member.first_name} ${member.last_name}`}
              >
                {member.first_name} {member.last_name}
              </h3>
              {isAdmin && member.membership_status === 'expired' && (
                <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 mt-1">
                  Cotisation expirée
                </span>
              )}
            </div>
          </div>

          {member.roles && member.roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {member.roles.map((role, index) => (
                <span
                  key={index}
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(role as Role)}`}
                >
                  {getRoleLabel(role)}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1.5 text-sm text-gray-500">
            {member.email && (
              <div className="flex items-center space-x-2 overflow-hidden">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate" title={hasFullAccess ? member.email : formatEmail(member.email, hasFullAccess)}>
                  {formatEmail(member.email, hasFullAccess)}
                </span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span className="truncate" title={member.phone}>
                  {member.phone}
                </span>
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Confirmer la suppression</h3>
            <p className="text-gray-500 mb-6">
              Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setShowDeleteDialog(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberCard;
