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

  useEffect(() => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4 sm:mb-0">Membres</h1>
        {hasAnyGroup(user, ["ADMIN", "INSTRUCTOR"]) && (
          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter un membre
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Rechercher un membre..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <select
              className="form-select block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs</option>
              <option value="instructor">Instructeurs</option>
              <option value="pilot">Pilotes</option>
              <option value="student">Élèves</option>
            </select>

            <select
              className="form-select block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedMembershipStatus}
              onChange={(e) => setSelectedMembershipStatus(e.target.value)}
            >
              <option value="all">Toutes les cotisations</option>
              <option value="valid">Cotisations valides</option>
              <option value="expired">Cotisations expirées</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <MemberCard 
            key={member.id} 
            member={member}
            onDelete={loadMembers}
          />
        ))}
      </div>

      <AddMemberForm
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={() => {
          setIsAddMemberOpen(false);
          loadMembers();
        }}
      />
    </div>
  );
};

export default MemberList;