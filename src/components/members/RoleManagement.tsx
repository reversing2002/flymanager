import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getMembersWithBalance } from "../../lib/queries/users";
import { getAllGroups, getUserGroups, updateUserGroups } from "../../lib/queries/groups";
import type { User as UserType } from "../../types/database";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface Group {
  id: string;
  name: string;
  description: string | null;
}

const RoleManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<UserType[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string[]>>({});
  const [allSelected, setAllSelected] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [membersData, groupsData] = await Promise.all([
        getMembersWithBalance(),
        getAllGroups()
      ]);

      setMembers(membersData);
      setGroups(groupsData);

      // Charger les groupes pour chaque membre
      const memberGroups: Record<string, string[]> = {};
      await Promise.all(
        membersData.map(async (member) => {
          const userGroups = await getUserGroups(member.id);
          memberGroups[member.id] = userGroups.map(group => group.id);
        })
      );
      setSelectedGroups(memberGroups);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = async (memberId: string, groupId: string) => {
    const newSelectedGroups = { ...selectedGroups };
    const currentGroups = newSelectedGroups[memberId] || [];
    const isAdmin = groups.find(g => g.id === groupId)?.name?.toLowerCase() === 'admin';
    const hasAdminRole = currentGroups.some(gId => groups.find(g => g.id === gId)?.name?.toLowerCase() === 'admin');

    // Si on essaie d'ajouter un rôle à un admin
    if (hasAdminRole && !currentGroups.includes(groupId)) {
      toast.error("Un administrateur ne peut pas avoir d'autres rôles");
      return;
    }

    // Si on essaie d'ajouter le rôle admin à quelqu'un qui a déjà d'autres rôles
    if (isAdmin && currentGroups.length > 0) {
      toast.error("Le rôle administrateur ne peut pas être cumulé avec d'autres rôles");
      return;
    }

    if (currentGroups.includes(groupId)) {
      newSelectedGroups[memberId] = currentGroups.filter(g => g !== groupId);
    } else {
      newSelectedGroups[memberId] = [...currentGroups, groupId];
    }
    setSelectedGroups(newSelectedGroups);

    try {
      await updateUserGroups(memberId, newSelectedGroups[memberId]);
      toast.success("Groupes mis à jour avec succès");
    } catch (error) {
      console.error("Error updating groups:", error);
      toast.error("Erreur lors de la mise à jour des groupes");
      // Recharger les données en cas d'erreur pour s'assurer de la cohérence
      loadData();
    }
  };

  const toggleAllForGroup = async (groupId: string) => {
    const newAllSelected = { ...allSelected };
    newAllSelected[groupId] = !allSelected[groupId];
    setAllSelected(newAllSelected);

    const newSelectedGroups = { ...selectedGroups };
    const updatePromises = members.map(async (member) => {
      if (newAllSelected[groupId]) {
        if (!newSelectedGroups[member.id]) {
          newSelectedGroups[member.id] = [];
        }
        if (!newSelectedGroups[member.id].includes(groupId)) {
          newSelectedGroups[member.id] = [...newSelectedGroups[member.id], groupId];
          await updateUserGroups(member.id, newSelectedGroups[member.id]);
        }
      } else {
        if (newSelectedGroups[member.id]?.includes(groupId)) {
          newSelectedGroups[member.id] = newSelectedGroups[member.id].filter(g => g !== groupId);
          await updateUserGroups(member.id, newSelectedGroups[member.id]);
        }
      }
    });

    try {
      await Promise.all(updatePromises);
      setSelectedGroups(newSelectedGroups);
      toast.success("Groupes mis à jour avec succès pour tous les membres");
    } catch (error) {
      console.error("Error updating groups for all members:", error);
      toast.error("Erreur lors de la mise à jour des groupes");
      // Recharger les données en cas d'erreur
      loadData();
    }
  };

  // Trier et filtrer les membres
  const filteredMembers = members
    .sort((a, b) => {
      const nameA = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase();
      const nameB = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase();
      return nameA.localeCompare(nameB);
    })
    .filter((member) => {
      const searchString = `${member.first_name || ''} ${member.last_name || ''} ${member.email || ''}`.toLowerCase();
      return searchString.includes(searchQuery.toLowerCase());
    });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">Gestion des Groupes</h1>
          <button
            onClick={() => navigate('/members')}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Retour à la liste
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto relative">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="min-w-full bg-white shadow-sm rounded-lg">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="divide-x divide-slate-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">
                  Membre
                </th>
                {groups.map((group) => (
                  <th key={group.id} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">
                    <div className="flex items-center space-x-2">
                      <span title={group.description || undefined}>{group.name}</span>
                      <input
                        type="checkbox"
                        checked={allSelected[group.id] || false}
                        onChange={() => toggleAllForGroup(group.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredMembers.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {(member.last_name || '').toUpperCase()} {member.first_name || ''}
                        </div>
                        <div className="text-sm text-slate-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  {groups.map((group) => (
                    <td key={`${member.id}-${group.id}`} className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedGroups[member.id]?.includes(group.id) || false}
                        onChange={() => toggleGroup(member.id, group.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
