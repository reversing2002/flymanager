import { useState, useEffect } from "react";
import { Search, Filter, Plus, UserCog, Download, FileText, MoreVertical } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportToCSV, exportToPDF } from "../../utils/exportUtils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { User as UserType } from "../../types/database";
import type { Contribution } from "../../types/contribution";
import { getMembersWithBalance } from "../../lib/queries/users";
import { getAllActiveContributions } from "../../lib/queries/contributions";
import MemberCard from "./MemberCard";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import AddMemberForm from "./AddMemberForm";
import { addMonths, isAfter } from "date-fns";
import { useNavigate } from "react-router-dom";

const MemberList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembershipStatus, setSelectedMembershipStatus] = useState<string>("valid");
  const [showFilters, setShowFilters] = useState(false);
  const [members, setMembers] = useState<(UserType & { contributions?: Contribution[] })[]>([]);
  const [allContributions, setAllContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportCSV = () => {
    const clubUsesCotisations = members.some(member => {
      return member.contributions && member.contributions.length > 0 && (() => {
        const sortedContributions = [...member.contributions].sort((a, b) => new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime());
        const lastContribution = sortedContributions[0];
        return isAfter(new Date(lastContribution.valid_until), new Date());
      })();
    });

    const headers = clubUsesCotisations ? ['Nom', 'Prénom', 'Email', 'Date de fin de cotisation', 'Montant'] : ['Nom', 'Prénom', 'Email'];
    const data = filteredMembers.map(member => {
      const lastContribution = member.contributions && member.contributions.length > 0
        ? [...member.contributions].sort((a, b) => new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime())[0]
        : null;

      return [
        member.last_name || '',
        member.first_name || '',
        member.email || '',
        lastContribution?.valid_until ? format(new Date(lastContribution.valid_until), 'dd-MM-yyyy', { locale: fr }) : '',
        lastContribution?.account_entry?.amount !== undefined ? Math.abs(lastContribution.account_entry.amount).toString() : ''
      ];
    });

    exportToCSV({
      filename: 'liste_membres',
      headers,
      data
    });
  };

  const handleExportPDF = () => {
    const clubUsesCotisations = members.some(member => {
      return member.contributions && member.contributions.length > 0 && (() => {
        const sortedContributions = [...member.contributions].sort((a, b) => new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime());
        const lastContribution = sortedContributions[0];
        return isAfter(new Date(lastContribution.valid_until), new Date());
      })();
    });

    const headers = clubUsesCotisations ? ['Nom', 'Prénom', 'Email', 'Date de fin', 'Montant'] : ['Nom', 'Prénom', 'Email'];
    const data = filteredMembers.map(member => {
      const lastContribution = member.contributions && member.contributions.length > 0
        ? [...member.contributions].sort((a, b) => new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime())[0]
        : null;

      return [
        member.last_name || '',
        member.first_name || '',
        member.email || '',
        lastContribution?.valid_until ? format(new Date(lastContribution.valid_until), 'dd-MM-yyyy', { locale: fr }) : '',
        lastContribution?.account_entry?.amount !== undefined ? `${Math.abs(lastContribution.account_entry.amount)} €` : ''
      ];
    });

    exportToPDF({
      filename: 'liste_membres',
      headers,
      data,
      title: 'Liste des membres'
    });
  };

  const loadMembers = async () => {
    try {
      const [membersData, contributionsData] = await Promise.all([
        getMembersWithBalance(),
        getAllActiveContributions()
      ]);

      // Organiser les contributions par utilisateur
      const contributionsByUser = contributionsData.reduce((acc, contribution) => {
        if (!acc[contribution.user_id]) {
          acc[contribution.user_id] = [];
        }
        acc[contribution.user_id].push(contribution);
        return acc;
      }, {} as Record<string, Contribution[]>);

      // Associer les contributions aux membres
      const membersWithContributions = membersData.map(member => ({
        ...member,
        contributions: contributionsByUser[member.id] || []
      }));

      setMembers(membersWithContributions);
      setAllContributions(contributionsData);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Vérifier si l'utilisateur est admin
  const isAdmin = hasAnyGroup(user, ['admin']);

  // Définir le statut de filtrage par défaut en fonction du rôle
  useEffect(() => {
    setSelectedMembershipStatus(isAdmin ? 'all' : 'valid');
  }, [isAdmin]);

  const clubUsesCotisations = members.some(member => {
    return member.contributions && member.contributions.length > 0 && (() => {
      const sortedContributions = [...member.contributions].sort((a, b) => new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime());
      const lastContribution = sortedContributions[0];
      return isAfter(new Date(lastContribution.valid_until), new Date());
    })();
  });

  const filteredMembers = members.filter((member) => {
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    const memberFields = [
      member.first_name?.toLowerCase() || '',
      member.last_name?.toLowerCase() || '',
      member.email?.toLowerCase() || ''
    ];

    const matchesSearch = searchTerms.every(term => 
      memberFields.some(field => field.includes(term))
    );

    if (!clubUsesCotisations) return matchesSearch;

    // Vérifier si la cotisation est valide
    const isMembershipValid = member.contributions && member.contributions.length > 0 && (() => {
      const sortedContributions = [...member.contributions].sort((a, b) => new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime());
      const lastContribution = sortedContributions[0];
      const validUntil = new Date(lastContribution.valid_until);
      return isAfter(validUntil, new Date());
    })();

    // Pour les admins, appliquer le filtre sélectionné
    const matchesMembershipStatus =
      selectedMembershipStatus === "all" ||
      (selectedMembershipStatus === "valid" && isMembershipValid) ||
      (selectedMembershipStatus === "expired" && !isMembershipValid);

    return matchesSearch && matchesMembershipStatus;
  })
  // Tri par année de dernière cotisation DESC puis par nom ASC
  .sort((a, b) => {
    if (!clubUsesCotisations) {
      return a.last_name.localeCompare(b.last_name);
    }
    // Récupérer la dernière cotisation pour chaque membre
    const getLastContribution = (member: typeof a) => {
      if (!member.contributions || member.contributions.length === 0) return null;
      return [...member.contributions].sort(
        (x, y) => new Date(y.valid_until).getTime() - new Date(x.valid_until).getTime()
      )[0];
    };

    const aContrib = getLastContribution(a);
    const bContrib = getLastContribution(b);

    // Comparer les dates de fin au niveau du jour (ignorer les heures)
    const aDay = aContrib ? new Date(new Date(aContrib.valid_until).setHours(0, 0, 0, 0)) : new Date(0);
    const bDay = bContrib ? new Date(new Date(bContrib.valid_until).setHours(0, 0, 0, 0)) : new Date(0);
    
    if (aDay.getTime() !== bDay.getTime()) {
      return bDay.getTime() - aDay.getTime(); // DESC
    }

    // Si même date, trier par nom puis prénom
    const aName = (a.last_name || '').toLowerCase();
    const bName = (b.last_name || '').toLowerCase();
    
    if (aName !== bName) {
      return aName.localeCompare(bName); // ASC
    }
    
    // Si même nom, trier par prénom
    const aFirstName = (a.first_name || '').toLowerCase();
    const bFirstName = (b.first_name || '').toLowerCase();
    return aFirstName.localeCompare(bFirstName); // ASC
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
        {hasAnyGroup(user, ["ADMIN"]) && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="flex gap-2 w-full sm:w-auto order-1">
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm">Nouveau membre</span>
              </button>
              <button
                onClick={() => navigate('/members/roles')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <UserCog className="h-5 w-5" />
                <span className="text-sm">Gérer les rôles</span>
              </button>
            </div>
            
            {/* Version mobile du bouton export */}
            <div className="relative sm:hidden order-2 w-full">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-sm"
                title="Options d'export"
              >
                <Download className="w-4 h-4" />
                <span>Options d'export</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 flex items-center"
                      role="menuitem"
                    >
                      <FileText className="w-4 h-4 mr-3" />
                      Format CSV
                    </button>
                    <button
                      onClick={() => {
                        handleExportPDF();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 flex items-center"
                      role="menuitem"
                    >
                      <Download className="w-4 h-4 mr-3" />
                      Format PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Version desktop des boutons export */}
            <div className="hidden sm:flex gap-2 w-full sm:w-auto order-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center px-4 py-2 bg-green-600/90 text-white rounded hover:bg-green-700 transition-colors"
                title="Exporter en CSV"
              >
                <FileText className="w-5 h-5 mr-2" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center justify-center px-4 py-2 bg-red-600/90 text-white rounded hover:bg-red-700 transition-colors"
                title="Exporter en PDF"
              >
                <Download className="w-5 h-5 mr-2" />
                <span>PDF</span>
              </button>
            </div>
          </div>
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (clubUsesCotisations) {
                  if (e.target.value !== "") {
                    setSelectedMembershipStatus("all");
                  } else {
                    setSelectedMembershipStatus("valid");
                  }
                }
              }}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          </div>
          {clubUsesCotisations && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filtres
            </button>
          )}
        </div>

        {clubUsesCotisations && showFilters && (
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
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
        {/* Membre connecté */}
        {filteredMembers
          .filter(member => member.id === user?.id)
          .map((member) => (
            <div key={member.id} className="col-span-1 md:col-span-2 lg:col-span-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <MemberCard 
                  member={member}
                  onDelete={loadMembers}
                  showContributionInfo={clubUsesCotisations}
                />
              </div>
            </div>
          ))}
        
        {/* Autres membres */}
        {filteredMembers
          .filter(member => member.id !== user?.id)
          .map((member) => (
            <MemberCard 
              key={member.id} 
              member={member}
              onDelete={loadMembers}
              showContributionInfo={clubUsesCotisations}
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