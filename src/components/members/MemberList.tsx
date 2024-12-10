import { useState, useEffect } from "react";
import { Search, Filter, Plus } from "lucide-react";
import type { User as UserType } from "../../types/database";
import type { Contribution } from "../../types/contribution";
import { getMembersWithBalance } from "../../lib/queries/users";
import { getContributionsByUserId } from "../../lib/queries/contributions";
import MemberCard from "./MemberCard";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import AddMemberForm from "./AddMemberForm";
import { addMonths, isAfter } from "date-fns";

const MemberList = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedMembershipStatus, setSelectedMembershipStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [members, setMembers] = useState<(UserType & { contributions?: Contribution[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const data = await getMembersWithBalance();
        
        // Charger les cotisations pour chaque membre
        const membersWithContributions = await Promise.all(
          data.map(async (member) => {
            try {
              const contributions = await getContributionsByUserId(member.id);
              return {
                ...member,
                contributions
              };
            } catch (error) {
              console.error(`Error loading contributions for member ${member.id}:`, error);
              return member;
            }
          })
        );
        
        setMembers(membersWithContributions);
      } catch (error) {
        console.error("Error loading members:", error);
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, []);

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      `${member.firstName} ${member.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      selectedRole === "all" ||
      (member.roles && member.roles.includes(selectedRole.toUpperCase()));

    // Vérifier si la cotisation est valide
    const isMembershipValid = member.contributions?.length ? (() => {
      const sortedContributions = [...member.contributions].sort(
        (a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
      );
      const lastContribution = sortedContributions[0];
      if (!lastContribution) return false;
      const validUntil = addMonths(new Date(lastContribution.valid_from), 12);
      return isAfter(validUntil, new Date());
    })() : false;

    const matchesMembershipStatus =
      selectedMembershipStatus === "all" ||
      (selectedMembershipStatus === "valid" && isMembershipValid) ||
      (selectedMembershipStatus === "expired" && !isMembershipValid);

    return matchesSearch && matchesRole && matchesMembershipStatus;
  });

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-12 bg-slate-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Membres</h1>
        {hasAnyGroup(user, ["ADMIN"]) && (
          <button 
            onClick={() => setIsAddMemberOpen(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter un membre</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un membre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Tous les rôles</option>
              <option value="pilot">Pilotes</option>
              <option value="instructor">Instructeurs</option>
              <option value="admin">Administrateurs</option>
              <option value="mechanic">Mécaniciens</option>
              <option value="student">Élèves</option>
            </select>

            <select
              value={selectedMembershipStatus}
              onChange={(e) => setSelectedMembershipStatus(e.target.value)}
              className="rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Toutes les cotisations</option>
              <option value="valid">Cotisations valides</option>
              <option value="expired">Cotisations expirées</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Statut de licence
                </label>
                <select className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500">
                  <option value="all">Tous</option>
                  <option value="valid">Valide</option>
                  <option value="expired">Expirée</option>
                  <option value="expiring">Expire bientôt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cotisation
                </label>
                <select className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500">
                  <option value="all">Tous</option>
                  <option value="paid">À jour</option>
                  <option value="unpaid">Non payée</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type d'appareil
                </label>
                <select className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500">
                  <option value="all">Tous</option>
                  <option value="plane">Avion</option>
                  <option value="ulm">ULM</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      <AddMemberForm
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={() => {
          // Recharger la liste des membres
          getMembersWithBalance().then(setMembers);
        }}
      />
    </div>
  );
};

export default MemberList;