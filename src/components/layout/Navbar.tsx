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
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { signOut } from "../../lib/supabase";
import { hasAnyGroup } from "../../lib/permissions";
import { getRoleLabel, getRoleBadgeColor } from "../../lib/utils/roleUtils";
import { getInitials } from "../../lib/utils/avatarUtils";
import type { Role } from "../../types/roles";
import { Logo } from '../common/Logo';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    // Ferme le menu après le changement de page
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const canAccessMembers = true;
  const canAccessFlights = !hasAnyGroup(currentUser, ["MECHANIC"]);
  const canAccessTraining = !hasAnyGroup(currentUser, ["MECHANIC"]);
  const canAccessAccounts = true;
  const canAccessSettings = hasAnyGroup(currentUser, ["ADMIN"]);
  const canAccessTrainingAdmin = hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR"]);
  const canAccessEvents = true;
  const showMyProgression = hasAnyGroup(currentUser, ["PILOT"]);
  const canAccessDocumentation = true;
  const canAccessChat = hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR", "PILOT"]);
  const canAccessDiscoveryFlights = hasAnyGroup(currentUser, ["ADMIN", "DISCOVERY_PILOT"]);
  const isInstructor = hasAnyGroup(currentUser, ["INSTRUCTOR"]);

  return (
    <>
      {/* Header fixe avec logo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1a1f2e] border-b border-gray-700 flex items-center justify-between">
        {/* Logo et bouton menu */}
        <div className="flex items-center">
          <div className="px-8 py-2 z-50 bg-[#1a1f2e]">
            <Logo className="h-8" />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden px-2"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
        </div>

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
          <Link 
            to="/reservations" 
            className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
            title="Planning"
          >
            <Calendar className="h-4 w-4" />
          </Link>
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
              <Link to="/reservations" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <Calendar className="w-5 h-5 mr-3" />
                <span>Planning</span>
              </Link>
              
              {/* Availability Management */}
              {hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR', 'MECHANIC']) && (
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
                <span>Mes réservations</span>
              </Link>
              {canAccessFlights && (
                <Link to="/flights" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <ClipboardList className="w-5 h-5 mr-3" />
                  <span>Mes vols</span>
                </Link>
              )}
              {canAccessAccounts && (
                <Link to="/accounts" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <CreditCard className="w-5 h-5 mr-3" />
                  <span>Mes comptes</span>
                </Link>
              )}
            </div>

            {/* FORMATION section */}
            {canAccessTraining && (
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
                <Link to="/members" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <Users className="w-5 h-5 mr-3" />
                  <span>Membres</span>
                </Link>
              )}
              <Link to={canAccessTrainingAdmin ? "/training-admin" : "/training"} className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <Book className="w-5 h-5 mr-3" />
                <span>QCM</span>
              </Link>
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
              {canAccessDocumentation && (
                <Link to="/documentation" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <Book className="w-5 h-5 mr-3" />
                  <span>Documentation</span>
                </Link>
              )}
              <Link to="/stats" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                <BarChart2 className="w-5 h-5 mr-3" />
                <span>Statistiques</span>
              </Link>
            </div>

            {/* Additional Links */}
            <div className="py-4">
              {canAccessChat && (
                <Link to="/chat" className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
                  <MessageSquare className="w-5 h-5 mr-3" />
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
            </div>
          </div>
        </div>

        {/* User section at bottom */}
        <div className="border-t border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
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
                    className={`inline-flex items-center w-full px-3 py-0.5 rounded-md text-[11px] font-medium tracking-wide ${getRoleBadgeColor(role)}`}
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
    </>
  );
};

export default Navbar;