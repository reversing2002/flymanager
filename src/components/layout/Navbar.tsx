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
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { signOut } from "../../lib/supabase";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTrainingMenu, setShowTrainingMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }

    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const canAccessMembers =
    user?.role === "ADMIN" || user?.role === "INSTRUCTOR";
  const canAccessFlights = user?.role !== "MECHANIC";
  const canAccessReservations = user?.role !== "MECHANIC";
  const canAccessTraining = user?.role !== "MECHANIC";
  const canAccessAccounts = true;
  const canAccessSettings = user?.role === "ADMIN";
  const canAccessTrainingAdmin =
    user?.role === "ADMIN" || user?.role === "INSTRUCTOR";
  const canAccessEvents = true;

  return (
    <nav className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Plane className="h-8 w-8 text-sky-400" />
            <span className="text-xl font-bold">SkyProut</span>
          </Link>

          <div className="hidden lg:flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              <NavLink
                to="/aircraft"
                icon={<Plane className="h-5 w-5" />}
                text="Appareils"
                compact
              />

              {canAccessReservations && (
                <NavLink
                  to="/reservations"
                  icon={<Calendar className="h-5 w-5" />}
                  text="Réservations"
                  compact
                />
              )}

              {canAccessMembers && (
                <NavLink
                  to="/members"
                  icon={<Users className="h-5 w-5" />}
                  text="Membres"
                  compact
                />
              )}

              {canAccessFlights && (
                <NavLink
                  to="/flights"
                  icon={<ClipboardList className="h-5 w-5" />}
                  text="Vols"
                  compact
                />
              )}

              {canAccessTraining && (
                <NavLink
                  to={canAccessTrainingAdmin ? "/training-admin" : "/training"}
                  icon={<Book className="h-5 w-5" />}
                  text="Formation"
                  compact
                />
              )}

              {canAccessAccounts && (
                <NavLink
                  to="/accounts"
                  icon={<CreditCard className="h-5 w-5" />}
                  text="Comptes"
                  compact
                />
              )}

              <NavLink
                to="/chat"
                icon={<MessageSquare className="h-5 w-5" />}
                text="Messages"
                compact
              />

              {canAccessEvents && (
                <NavLink
                  to="/events"
                  icon={<CalendarDays className="h-5 w-5" />}
                  text="Événements"
                  compact
                />
              )}
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

          <div
            className={`
            fixed inset-0 z-50 lg:hidden bg-slate-900
            transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}
          `}
          >
            <div className="flex flex-col h-full pt-16 px-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-md hover:bg-slate-800"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="flex flex-col space-y-4">
                <NavLink
                  to="/aircraft"
                  icon={<Plane className="h-5 w-5" />}
                  text="Appareils"
                  onClick={() => setIsMobileMenuOpen(false)}
                />

                {canAccessReservations && (
                  <NavLink
                    to="/reservations"
                    icon={<Calendar className="h-5 w-5" />}
                    text="Réservations"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}

                {canAccessMembers && (
                  <NavLink
                    to="/members"
                    icon={<Users className="h-5 w-5" />}
                    text="Membres"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}

                {canAccessFlights && (
                  <NavLink
                    to="/flights"
                    icon={<ClipboardList className="h-5 w-5" />}
                    text="Vols"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}

                {canAccessTraining && (
                  <NavLink
                    to={
                      canAccessTrainingAdmin ? "/training-admin" : "/training"
                    }
                    icon={<Book className="h-5 w-5" />}
                    text="Formation"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}

                {canAccessAccounts && (
                  <NavLink
                    to="/accounts"
                    icon={<CreditCard className="h-5 w-5" />}
                    text="Comptes"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}

                <NavLink
                  to="/chat"
                  icon={<MessageSquare className="h-5 w-5" />}
                  text="Messages"
                  onClick={() => setIsMobileMenuOpen(false)}
                />

                {canAccessEvents && (
                  <NavLink
                    to="/events"
                    icon={<CalendarDays className="h-5 w-5" />}
                    text="Événements"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {canAccessSettings && (
              <Link
                to="/settings"
                className={`p-2 rounded-full transition-colors ${
                  location.pathname === "/settings"
                    ? "bg-slate-800 text-sky-400"
                    : "hover:bg-slate-800"
                }`}
                title="Paramètres"
              >
                <Settings className="h-5 w-5" />
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-slate-800"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="hidden md:block text-right mr-2">
                <div className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-slate-400">
                  {user?.club?.name || "Club non défini"}
                </div>
              </div>
              <Link
                to="/profile"
                className={`h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center hover:bg-sky-600 transition-colors ${
                  location.pathname === "/profile" ? "ring-2 ring-sky-400" : ""
                }`}
              >
                <span className="font-medium">
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
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
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors
        ${isActive ? "bg-slate-800 text-sky-400" : "hover:bg-slate-800"}
        ${compact ? "flex-row" : "flex-col justify-center sm:px-3 py-2"}`}
    >
      {icon}
      <span className={compact ? "" : "mt-1"}>{text}</span>
    </Link>
  );
};

export default Navbar;
