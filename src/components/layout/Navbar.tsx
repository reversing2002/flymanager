import React, { useState, useEffect } from "react";
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
import { getRoleLabel } from "../../lib/utils/roleUtils";
import { getInitials } from "../../lib/utils/avatarUtils";
import type { Role } from "../../types/roles";
import { Logo } from '../common/Logo';

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const canAccessFlights = !hasAnyGroup(user, ["MECHANIC"]);
  const canAccessTraining = !hasAnyGroup(user, ["MECHANIC"]);
  const canAccessAccounts = true;
  const canAccessSettings = hasAnyGroup(user, ["ADMIN"]);
  const canAccessTrainingAdmin = hasAnyGroup(user, ["ADMIN", "INSTRUCTOR"]);
  const canAccessEvents = true;
  const showMyProgression = hasAnyGroup(user, ["PILOT"]);
  const canAccessDocumentation = true;
  const canAccessChat = hasAnyGroup(user, ["ADMIN", "INSTRUCTOR", "PILOT"]);
  const canAccessDiscoveryFlights = hasAnyGroup(user, ["ADMIN", "DISCOVERY_PILOT"]);
  const isInstructor = hasAnyGroup(user, ["INSTRUCTOR"]);

  const trainingPath = canAccessTrainingAdmin ? "/training-admin" : "/training";

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case "PILOT":
        return "bg-sky-900/50 text-sky-300 ring-1 ring-sky-500/50";
      case "INSTRUCTOR":
        return "bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-500/50";
      case "ADMIN":
        return "bg-purple-900/50 text-purple-300 ring-1 ring-purple-500/50";
      case "MECHANIC":
        return "bg-orange-900/50 text-orange-300 ring-1 ring-orange-500/50";
      case "STUDENT":
        return "bg-blue-900/50 text-blue-300 ring-1 ring-blue-500/50";
      default:
        return "bg-gray-900/50 text-gray-300 ring-1 ring-gray-500/50";
    }
  };

  const NavDropdown = ({ 
    text, 
    icon, 
    children,
    id,
  }: { 
    text: string; 
    icon: React.ReactNode; 
    children: React.ReactNode;
    id: string;
  }) => {
    const isOpen = openDropdown === id;

    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className="flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-medium text-white hover:bg-slate-800"
        >
          {icon}
          {text}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className={`
            ${isMobileMenuOpen 
              ? "relative mt-1 bg-slate-800 rounded-md" 
              : "absolute left-0 mt-1 w-56 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5"
            }
          `}>
            <div className="py-1">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  const NavDropdownItem = ({
    to,
    icon,
    text,
    onClick,
  }: {
    to: string;
    icon: React.ReactNode;
    text: string;
    onClick?: () => void;
  }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
      <Link
        to={to}
        onClick={onClick}
        className={`
          flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white hover:bg-slate-800
          ${isActive ? 'bg-slate-800' : ''}
        `}
      >
        {icon}
        {text}
      </Link>
    );
  };

  const NavLink = ({
    to,
    icon,
    text,
    onClick,
    compact = false,
  }: {
    to: string;
    icon: React.ReactNode;
    text: string;
    onClick?: () => void;
    compact?: boolean;
  }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
      <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-medium transition-colors
          ${isActive ? "bg-slate-800 text-sky-400" : "hover:bg-slate-800"}
          ${compact ? "flex-row" : "flex-row sm:flex-row sm:px-1.5 sm:py-1"}`}
      >
        {icon}
        <span className={compact ? "" : "mt-1"}>{text}</span>
      </Link>
    );
  };

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
              <MessageSquare className="w-5 h-5" />
            </Link>
          )}
          <Link 
            to="/reservations" 
            className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
            title="Planning"
          >
            <Calendar className="w-5 h-5" />
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
                  <span>Carnet de route</span>
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
                      <span>Vols d'instruction</span>
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
              <Link to={trainingPath} className="flex items-center px-4 py-2 text-gray-300 hover:bg-[#2a2f3e] hover:text-blue-400">
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
            {user?.image_url ? (
              <img
                src={user.image_url}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                {getInitials(user?.first_name, user?.last_name)}
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{user?.first_name} {user?.last_name}</div>
              <div className="flex flex-col gap-1 mt-2">
                {user?.roles?.map((role) => (
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