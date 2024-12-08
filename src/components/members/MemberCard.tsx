import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail } from "lucide-react";
import type { User as UserType } from "../../types/database";
import type { Contribution } from "../../types/contribution";
import { isAfter, addMonths } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { getRoleLabel } from "../../lib/utils/roleUtils";
import { Role } from "../../types/roles";

interface MemberCardProps {
  member: UserType & { contributions?: Contribution[] };
}

const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

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

  return (
    <div
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/members/${member.id}`)}
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
          {!isMembershipValid && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
              Cotisation expirée
            </span>
          )}
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
