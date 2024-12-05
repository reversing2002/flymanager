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

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
      setOpenDropdown(null);
    }

    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
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
        return "bg-sky-500 text-sky-100";
      case "INSTRUCTOR":
        return "bg-green-500 text-green-100";
      case "ADMIN":
        return "bg-purple-500 text-purple-100";
      case "MECHANIC":
        return "bg-orange-500 text-orange-100";
      case "STUDENT":
        return "bg-blue-500 text-blue-100";
      default:
        return "bg-gray-500 text-gray-100";
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
    <nav className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-1">
            <Plane className="h-6 w-6 text-sky-400" />
            <span className="text-lg font-bold">SkyProut</span>
          </Link>

          <div className="hidden lg:flex lg:gap-x-3 items-center">
            <NavLink
              to="/reservations"
              icon={<Calendar className="h-4 w-4" />}
              text="Planning"
              compact
            />

            {canAccessTraining && (
              <NavDropdown text="Élève" icon={<GraduationCap className="h-4 w-4" />} id="eleve">
                <NavDropdownItem
                  to="/training"
                  icon={<GraduationCap className="h-4 w-4" />}
                  text="Entrainement"
                />
                {showMyProgression && (
                  <NavDropdownItem
                    to="/progression"
                    icon={<Book className="h-4 w-4" />}
                    text="Ma progression"
                  />
                )}
              </NavDropdown>
            )}

            <div className="flex flex-wrap gap-0.5">
              <NavDropdown
                id="data"
                text="Données"
                icon={<Database className="h-4 w-4" />}
              >
                <NavDropdownItem
                  to="/aircraft"
                  icon={<Plane className="h-4 w-4" />}
                  text="Appareils"
                />
                {canAccessMembers && (
                  <NavDropdownItem
                    to="/members"
                    icon={<Users className="h-4 w-4" />}
                    text="Membres"
                  />
                )}
                {isInstructor && (
                  <NavDropdownItem
                    to="/instructor-students"
                    icon={<GraduationCap className="h-4 w-4" />}
                    text="Mes élèves"
                  />
                )}
                {canAccessDiscoveryFlights && (
                  <NavDropdownItem
                    to="/discovery-flights"
                    icon={<Plane className="h-4 w-4" />}
                    text="Vols découverte"
                  />
                )}
                {canAccessDocumentation && (
                  <NavDropdownItem
                    to="/documentation"
                    icon={<Book className="h-4 w-4" />}
                    text="Documentation"
                  />
                )}
                <NavDropdownItem
                  to="/stats"
                  icon={<BarChart2 className="h-4 w-4" />}
                  text="Statistiques"
                />
              </NavDropdown>

              <NavDropdown
                id="vol"
                text="Vol"
                icon={<Plane className="h-4 w-4" />}
              >
                <NavDropdownItem
                  to="/my-reservations"
                  icon={<Calendar className="h-4 w-4" />}
                  text="Mes réservations"
                />
                {canAccessFlights && (
                  <NavDropdownItem
                    to="/flights"
                    icon={<ClipboardList className="h-4 w-4" />}
                    text="Mes vols"
                  />
                )}
                {isInstructor && (
                  <NavDropdownItem
                    to="/instructor-flights"
                    icon={<ClipboardList className="h-4 w-4" />}
                    text="Vols d'instruction"
                  />
                )}
                {canAccessAccounts && (
                  <NavDropdownItem
                    to="/accounts"
                    icon={<CreditCard className="h-4 w-4" />}
                    text="Mes comptes"
                  />
                )}
              </NavDropdown>

              {canAccessTrainingAdmin && (
                <NavDropdown
                  id="formation"
                  text="Formation"
                  icon={<GraduationCap className="h-4 w-4" />}
                >
                  <NavDropdownItem
                    to="/progression/admin"
                    icon={<Book className="h-4 w-4" />}
                    text="Formations"
                  />
                  <NavDropdownItem
                    to="/progression/students"
                    icon={<Users className="h-4 w-4" />}
                    text="Progression des élèves"
                  />
                  {canAccessTraining && (
                    <NavDropdownItem
                      to={trainingPath}
                      icon={<Book className="h-4 w-4" />}
                      text="QCM"
                    />
                  )}
                </NavDropdown>
              )}

              {canAccessChat && (
                <NavLink
                  to="/chat"
                  icon={<MessageSquare className="h-4 w-4" />}
                  text="Messages"
                  compact
                />
              )}

              {canAccessEvents && (
                <NavLink
                  to="/events"
                  icon={<CalendarDays className="h-4 w-4" />}
                  text="Événements"
                  compact
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <div className="flex flex-col items-end">
                <div className="text-sm font-medium text-slate-300">
                  {user?.first_name}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {user?.roles?.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-opacity-20 ${getRoleBadgeColor(
                        role
                      )}`}
                    >
                      {getRoleLabel(role)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative group">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === "user" ? null : "user")}
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-slate-800"
                  >
                    {user?.image_url ? (
                      <img
                        src={user.image_url}
                        alt={`${user.first_name} ${user.last_name}`}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white">
                        {getInitials(user?.first_name, user?.last_name)}
                      </div>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {openDropdown === "user" && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        {canAccessSettings && (
                          <NavDropdownItem
                            to="/settings"
                            icon={<Settings className="h-4 w-4" />}
                            text="Paramètres"
                            onClick={() => setOpenDropdown(null)}
                          />
                        )}
                        <NavDropdownItem
                          to="#"
                          icon={<LogOut className="h-4 w-4" />}
                          text="Déconnexion"
                          onClick={handleLogout}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-slate-800"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`
          fixed inset-0 z-50 lg:hidden bg-slate-900 overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full pt-16 px-4 pb-4">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-md hover:bg-slate-800"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="space-y-4">
            <NavLink
              to="/reservations"
              icon={<Calendar className="h-4 w-4" />}
              text="Planning"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {canAccessTraining && (
              <NavDropdown 
                id="eleve-mobile"
                text="Élève" 
                icon={<GraduationCap className="h-4 w-4" />}
              >
                <div className="space-y-2 p-2">
                  <NavDropdownItem
                    to="/training"
                    icon={<GraduationCap className="h-4 w-4" />}
                    text="Entrainement"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  {showMyProgression && (
                    <NavDropdownItem
                      to="/progression"
                      icon={<Book className="h-4 w-4" />}
                      text="Ma progression"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  )}
                </div>
              </NavDropdown>
            )}

            <NavDropdown
              id="donnees-mobile"
              text="Données"
              icon={<Database className="h-4 w-4" />}
            >
              <div className="space-y-2 p-2">
                <NavDropdownItem
                  to="/aircraft"
                  icon={<Plane className="h-4 w-4" />}
                  text="Appareils"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                {canAccessMembers && (
                  <NavDropdownItem
                    to="/members"
                    icon={<Users className="h-4 w-4" />}
                    text="Membres"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
                {isInstructor && (
                  <NavDropdownItem
                    to="/instructor-students"
                    icon={<GraduationCap className="h-4 w-4" />}
                    text="Mes élèves"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
                {canAccessDiscoveryFlights && (
                  <NavDropdownItem
                    to="/discovery-flights"
                    icon={<Plane className="h-4 w-4" />}
                    text="Vols découverte"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
                {canAccessDocumentation && (
                  <NavDropdownItem
                    to="/documentation"
                    icon={<Book className="h-4 w-4" />}
                    text="Documentation"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
                <NavDropdownItem
                  to="/stats"
                  icon={<BarChart2 className="h-4 w-4" />}
                  text="Statistiques"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              </div>
            </NavDropdown>

            <NavDropdown
              id="vol-mobile"
              text="Vol"
              icon={<Plane className="h-4 w-4" />}
            >
              <div className="space-y-2 p-2">
                <NavDropdownItem
                  to="/my-reservations"
                  icon={<Calendar className="h-4 w-4" />}
                  text="Mes réservations"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                {canAccessFlights && (
                  <NavDropdownItem
                    to="/flights"
                    icon={<ClipboardList className="h-4 w-4" />}
                    text="Mes vols"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
                {isInstructor && (
                  <NavDropdownItem
                    to="/instructor-flights"
                    icon={<ClipboardList className="h-4 w-4" />}
                    text="Vols d'instruction"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
                {canAccessAccounts && (
                  <NavDropdownItem
                    to="/accounts"
                    icon={<CreditCard className="h-4 w-4" />}
                    text="Mes comptes"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
              </div>
            </NavDropdown>

            {canAccessTrainingAdmin && (
              <NavDropdown
                id="formation-mobile"
                text="Formation"
                icon={<GraduationCap className="h-4 w-4" />}
              >
                <div className="space-y-2 p-2">
                  <NavDropdownItem
                    to="/progression/admin"
                    icon={<Book className="h-4 w-4" />}
                    text="Formations"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <NavDropdownItem
                    to="/progression/students"
                    icon={<Users className="h-4 w-4" />}
                    text="Progression des élèves"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  {canAccessTraining && (
                    <NavDropdownItem
                      to={trainingPath}
                      icon={<Book className="h-4 w-4" />}
                      text="QCM"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  )}
                </div>
              </NavDropdown>
            )}

            {canAccessChat && (
              <NavLink
                to="/chat"
                icon={<MessageSquare className="h-4 w-4" />}
                text="Messages"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {canAccessEvents && (
              <NavLink
                to="/events"
                icon={<CalendarDays className="h-4 w-4" />}
                text="Événements"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}
          </div>

          {/* Mobile user info */}
          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className="flex items-center gap-4">
              {user?.image_url ? (
                <img
                  src={user.image_url}
                  alt={`${user.first_name} ${user.last_name}`}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {getInitials(user?.first_name, user?.last_name)}
                  </span>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-white">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-xs text-slate-400">{user?.email}</div>
              </div>
            </div>

            <div className="mt-6 space-y-1">
              {canAccessSettings && (
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-2 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Paramètres</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;