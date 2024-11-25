import React from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { User, Phone, Mail, Calendar } from "lucide-react";
import type { User as UserType } from "../../types/database";
import { getMembershipStatus } from "../../lib/queries";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface MemberCardProps {
  member: UserType;
}

const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isMembershipValid, setIsMembershipValid] = useState<boolean>(true);

  const isAdmin = currentUser?.role === "ADMIN";
  const isInstructor = currentUser?.role === "INSTRUCTOR";
  const canViewFinancials = isAdmin || isInstructor;

  useEffect(() => {
    const checkMembership = async () => {
      try {
        const isValid = await getMembershipStatus(member.id);
        setIsMembershipValid(isValid);
      } catch (error) {
        console.error("Erreur lors de la vérification de la cotisation:", error);
      }
    };
    checkMembership();
  }, [member.id]);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "PILOT":
        return "Pilote";
      case "INSTRUCTOR":
        return "Instructeur";
      case "ADMIN":
        return "Administrateur";
      case "MECHANIC":
        return "Mécanicien";
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "PILOT":
        return "bg-emerald-100 text-emerald-800";
      case "INSTRUCTOR":
        return "bg-purple-100 text-purple-800";
      case "ADMIN":
        return "bg-sky-100 text-sky-800";
      case "MECHANIC":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
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
              {member.imageUrl ? (
                <img
                  src={member.imageUrl}
                  alt={`${member.firstName} ${member.lastName}`}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-slate-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {`${member.firstName} ${member.lastName}`}
              </h3>
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                  member.role
                )}`}
              >
                {getRoleLabel(member.role)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center space-x-2 text-slate-600">
            <Mail className="h-4 w-4" />
            <span>{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center space-x-2 text-slate-600">
              <Phone className="h-4 w-4" />
              <span>{member.phone}</span>
            </div>
          )}
        </div>

        {!isMembershipValid && (
          <div className="mt-4 p-2 bg-amber-50 text-amber-800 text-sm rounded-lg">
            Cotisation non à jour
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberCard;