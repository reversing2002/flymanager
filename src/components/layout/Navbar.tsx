import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Plane,
  Calendar,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Book,
  CreditCard,
  Menu,
  X,
  MessageSquare,
  CalendarDays,
  BarChart2,
  GraduationCap,
  ChevronDown,
  Database,
  Home,
  CloudSun,
  Mail,
  Shield,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { signOut } from "../../lib/supabase";
import { usePermissions, hasPermission, hasAnyGroup } from "../../lib/permissions";
import { PERMISSIONS } from "../../types/permissions";
import { getRoleLabel, getRoleBadgeClass } from "../../lib/utils/roleUtils";
import { getInitials } from "../../lib/utils/avatarUtils";
import type { Role } from "../../types/roles";
import { Logo } from '../common/Logo';
import { SupportDialog } from './SupportDialog';
import { useUnreadMessages } from "../../hooks/useUnreadMessages";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, setActiveClub } = useAuth();
  const permissions = usePermissions(currentUser);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const unreadMessagesCount = useUnreadMessages();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      // Nettoyer le stockage local d'abord
      window.localStorage.clear();
      
      // Tenter la déconnexion Supabase
      await signOut();
      
      // Rediriger vers la page de connexion
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // En cas d'erreur, rediriger quand même vers la page de connexion
      navigate("/login", { replace: true });
    }
  };

  // Utilisation des permissions basées sur les permissions définies
  const canAccessMembers = hasPermission(currentUser, PERMISSIONS.USER_VIEW);
  const canAccessFlights = hasPermission(currentUser, PERMISSIONS.FLIGHT_VIEW);
  const canAccessTraining = hasPermission(currentUser, PERMISSIONS.TRAINING_VIEW);
  const canAccessAccounts = hasPermission(currentUser, PERMISSIONS.USER_VIEW);
  const canAccessSettings = hasPermission(currentUser, PERMISSIONS.SETTINGS_VIEW);
  const canAccessTrainingAdmin = hasPermission(currentUser, PERMISSIONS.TRAINING_MODIFY);
  const canAccessEvents = hasPermission(currentUser, PERMISSIONS.EVENT_VIEW);
  const canAccessChat = hasPermission(currentUser, PERMISSIONS.CHAT_VIEW);
  const canManageAvailability = hasAnyGroup(currentUser, ["INSTRUCTOR", "ADMIN"]);
  const canAccessDiscoveryFlights = hasPermission(currentUser, PERMISSIONS.DISCOVERY_FLIGHT_VIEW);
  const canAccessDocumentation = hasPermission(currentUser, PERMISSIONS.DOC_VIEW);
  const canViewPlanning = hasPermission(currentUser, PERMISSIONS.PLANNING_VIEW);
  const canModifyPlanning = hasPermission(currentUser, PERMISSIONS.PLANNING_MODIFY);
  
  // Pour les rôles spécifiques, on utilise toujours hasAnyGroup
  const showMyProgression = hasAnyGroup(currentUser, ["PILOT"]);
  const isInstructor = hasAnyGroup(currentUser, ["INSTRUCTOR"]);
  const isAdmin = hasAnyGroup(currentUser, ["ADMIN"]);

  // Logs de débogage
  console.log("Utilisateur actuel:", currentUser);
  console.log("Groupes de l'utilisateur:", currentUser?.user_metadata?.groups);
  console.log("Est instructeur:", isInstructor);

  return (
    <>
      {/* Header fixe avec logo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1a1f2e] border-b border-gray-700 flex items-center justify-between">
        {/* Logo et bouton menu */}
        <div className="flex items-center">
          <div className="px-8 py-2 z-50 bg-[#1a1f2e] lg:block hidden">
            <Logo className="h-8" />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-4 lg:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-400" />
            ) : (
              <Menu className="h-6 w-6 text-gray-400" />
            )}
          </button>
        </div>

        {/* Club selector */}
        {currentUser && (
          <div className="flex items-center px-4">
            <select
              className="bg-gray-800 text-white rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-700 hover:border-gray-600 transition-colors"
              value={currentUser.club?.id || ''}
              onChange={(e) => setActiveClub(e.target.value)}
            >
              {currentUser.availableClubs?.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Icônes de navigation - visibles sur tous les écrans */}
        <div className="flex items-center gap-4 px-4 py-2">
          {canAccessChat && (
            <Link 
              to="/chat" 
              className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
              title="Messages"
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
          )}
          {canViewPlanning && (
            <Link 
              to="/reservations" 
              className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
              title="Planning"
            >
              <Calendar className="h-4 w-4" />
            </Link>
          )}
          <Link 
            to="/weather" 
            className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
            title="Météo"
          >
            <CloudSun className="h-6 w-6 lg:h-4 lg:w-4" />
          </Link>
          <button
            onClick={() => setSupportDialogOpen(true)}
            className="lg:bg-blue-600 lg:hover:bg-blue-700 text-blue-500 lg:text-white px-3 lg:px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 lg:transition-colors lg:duration-200 lg:shadow-md lg:hover:shadow-lg hover:text-blue-400"
          >
            <HelpCircle className="h-6 w-6 lg:h-5 lg:w-5" />
            <span className="hidden lg:inline">Support</span>
          </button>
        </div>
      </div>

      {/* Menu latéral */}
      <nav
        className={`
          fixed top-0 left-0 z-40 w-64 bg-slate-900 shadow-xl transform transition-transform duration-300 ease-in-out
          h-full overflow-hidden flex flex-col pt-14
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-4 pb-20">
            {/* Navigation sections */}
            <div className="space-y-4">
              <div className="px-4 py-2 text-sm text-gray-500 uppercase">Navigation</div>
              <Link to="/" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <Home className="w-5 h-5 mr-3" />
                <span>Accueil</span>
              </Link>
              {canViewPlanning && (
              <Link to="/reservations" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <Calendar className="w-5 h-5 mr-3" />
                <span>Planning</span>
              </Link> 
              )}
              
              {/* Availability Management */}
              {canManageAvailability && (
                <Link 
                  to="/availability" 
                  className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400"
                >
                  <Calendar className="w-5 h-5 mr-3" />
                  <span>Disponibilités</span>
                </Link>
              )}
            </div>

            {/* VOLS section */}
            <div className="py-4">
              <div className="px-4 py-2 text-sm text-gray-500 uppercase">Vols</div>
              <Link to="/my-reservations" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <Calendar className="w-5 h-5 mr-3" />
                <span>Réservations</span>
              </Link>
              {canAccessFlights && (
                <Link to="/flights" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <ClipboardList className="w-5 h-5 mr-3" />
                  <span>Vols</span>
                </Link>
              )}
            
              {isAdmin && (
                    <Link to="/instructor-billing" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                      <CreditCard className="w-5 h-5 mr-3" />
                      <span>Facturation instructeurs</span>
                    </Link>
                  )}
                  {canAccessFlights && (
                  <Link to="/accounts" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                    <CreditCard className="w-5 h-5 mr-3" />
                    <span>Finances</span>
                  </Link>
                )}
                {hasAnyGroup(currentUser, ['SYSTEM_ADMIN']) && (
                  <>
                    <Link to="/club-stats" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                      <BarChart2 className="w-5 h-5 mr-3" />
                      <span>Statistiques Clubs</span>
                      <Shield className="w-4 h-4 ml-2 text-rose-500" />
                    </Link>
                    <Link to="/accounting" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                      <Database className="w-5 h-5 mr-3" />
                      <span>Comptabilité</span>
                      <Shield className="w-4 h-4 ml-2 text-rose-500" />
                    </Link>
                  </>
                )}
              
            </div>  

            {/* FORMATION section */}
            {(showMyProgression || isInstructor) && (
              <div className="py-4">
                <div className="px-4 py-2 text-sm text-gray-500 uppercase">Formation</div>
                {isInstructor && (
                  <>
                    <Link to="/instructor-students" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                      <GraduationCap className="w-5 h-5 mr-3" />
                      <span>Mes élèves</span>
                    </Link>
                    <Link to="/instructor-flights" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                      <ClipboardList className="w-5 h-5 mr-3" />
                      <span>Facturation</span>
                    </Link>
                    
                  </>
                )}
                {showMyProgression && (
                  <Link to="/progression" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                    <Book className="w-5 h-5 mr-3" />
                    <span>Ma progression</span>
                  </Link>
                )}
              </div>
            )}


            {/* DONNEES section */}
            <div className="py-4">
              <div className="px-4 py-2 text-sm text-gray-500 uppercase">Données</div>
              <Link to="/aircraft" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <Plane className="w-5 h-5 mr-3" />
                <span>Appareils</span>
              </Link>
              {canAccessMembers && (
                hasAnyGroup(currentUser, ["ADMIN"]) ? (
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === 'members' ? null : 'members')}
                      className="flex items-center px-4 py-2 bg-transparent text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400"
                    >
                      <Users className="w-5 h-5 mr-3" />
                      <span>Membres</span>
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </button>

                    {openDropdown === 'members' && (
                      <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1">
                          <Link
                            to="/members"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Liste des membres
                          </Link>
                          <Link
                            to="/members/roles"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Gestion des rôles
                          </Link>
                          <Link
                            to="/members/balances"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Soldes des membres
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link 
                    to="/members" 
                    className="flex items-center px-4 py-2 bg-transparent text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400"
                  >
                    <Users className="w-5 h-5 mr-3" />
                    <span>Membres</span>
                  </Link>
                )
              )}
              {canAccessTraining && (
                <div className="space-y-1">
                  <Link to="/training" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                    <GraduationCap className="w-5 h-5 mr-3" />
                    <span>QCM</span>
                  </Link>
                </div>
              )}
              {hasAnyGroup(currentUser, ["SYSTEM_ADMIN"]) && (
                <div className="space-y-1">
                  <Link to="/training-admin" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                    <Book className="w-5 h-5 mr-3" />
                    <span>Admin QCM</span>
                    <Shield className="w-4 h-4 ml-2 text-rose-500" />
                  </Link>
                </div>
              )}
              {canAccessTrainingAdmin && (
                <Link to="/progression/admin" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <Book className="w-5 h-5 mr-3" />
                  <span>Formations</span>
                </Link>
              )}
              {canAccessDiscoveryFlights && (
                <Link to="/discovery-flights" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <Plane className="w-5 h-5 mr-3" />
                  <span>Vols découverte</span>
                </Link>
              )}
              <Link to="/stats" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <BarChart2 className="w-5 h-5 mr-3" />
                <span>Statistiques</span>
              </Link>
              {canAccessDocumentation && (
                <Link to="/documentation" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <Book className="w-5 h-5 mr-3" />
                  <span>Documentation</span>
                </Link>
              )}
            </div>

            {/* Additional Links */}
            <div className="py-4">
              {canAccessChat && (
                <Link 
                  to="/chat" 
                  className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400"
                >
                  <div className="relative">
                    <MessageSquare className="w-5 h-5 mr-3" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  <span>Messages</span>
                </Link>
              )}
              {canAccessEvents && (
                <Link to="/events" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <CalendarDays className="w-5 h-5 mr-3" />
                  <span>Événements</span>
                </Link>
              )}
              {canAccessSettings && (
                <Link to="/settings" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <Settings className="w-5 h-5 mr-3" />
                  <span>Paramètres</span>
                </Link>
              )}
              <Link to="/weather" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <CloudSun className="w-5 h-5 mr-3" />
                <span>Météo</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User section at bottom */}
        <div className="border-t border-gray-700 p-4 flex-shrink-0">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-[#2a2f3e] p-2 rounded-lg transition-colors"
            onClick={() => navigate(`/members/${currentUser?.id}`)}
          >
            {currentUser?.image_url ? (
              <img
                src={currentUser.image_url}
                alt={`${currentUser.first_name} ${currentUser.last_name}`}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                {getInitials(currentUser?.first_name, currentUser?.last_name)}
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{currentUser?.first_name} {currentUser?.last_name}</div>
              <div className="flex flex-col gap-1 mt-2">
                {currentUser?.roles?.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center w-full px-3 py-0.5 rounded-md text-[11px] font-medium tracking-wide ${getRoleBadgeClass(role)}`}
                  >
                    {getRoleLabel(role)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 w-full flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400 rounded"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Déconnexion</span>
          </button>
        </div>
      </nav>
      {/* Support Dialog */}
      <SupportDialog
        open={supportDialogOpen}
        onClose={() => setSupportDialogOpen(false)}
      />
    </>
  );
};

export default Navbar;