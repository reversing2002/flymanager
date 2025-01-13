import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import toast from "react-hot-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  allowAll?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles, allowAll }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!user) {
    // Sauvegarder la page demandée pour y revenir après la connexion
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!allowAll && roles && !hasAnyGroup(user, roles)) {
    console.log(
      "Accès refusé - Rôles requis:",
      roles,
      "Rôles utilisateur:",
      user.roles
    );
    toast.error("Vous n'avez pas les permissions nécessaires pour accéder à cette page");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
