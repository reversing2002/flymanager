import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Logo } from "../common/Logo";
import { supabase } from "../../lib/supabase";

interface CreateClubFormData {
  clubName: string;
  clubCode: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminLogin: string;
}

const CreateClubPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateClubFormData>({
    clubName: "",
    clubCode: "",
    adminEmail: "",
    adminPassword: "",
    adminFirstName: "",
    adminLastName: "",
    adminLogin: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: clubError } = await supabase.rpc(
        "create_club_with_admin",
        {
          p_club_name: formData.clubName,
          p_club_code: formData.clubCode,
          p_admin_email: formData.adminEmail,
          p_admin_password: formData.adminPassword,
          p_admin_login: formData.adminLogin,
          p_admin_first_name: formData.adminFirstName,
          p_admin_last_name: formData.adminLastName,
        }
      );

      if (clubError) throw clubError;

      // Rediriger vers la page de login
      window.location.href = "/login";
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#1a1d21] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Logo className="mb-2" />
          <p className="text-gray-400 text-sm">Créer votre aéroclub</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="clubName" className="text-gray-300 text-sm">
                Nom du club
              </label>
              <input
                id="clubName"
                name="clubName"
                type="text"
                value={formData.clubName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="clubCode" className="text-gray-300 text-sm">
                Code OACI ou identifiant de l'aérodrome
              </label>
              <input
                id="clubCode"
                name="clubCode"
                type="text"
                value={formData.clubCode}
                onChange={handleChange}
                placeholder="ex: LFHL, LF4226"
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                required
                maxLength={10}
                pattern="[A-Za-z0-9]{3,10}"
                title="Le code doit contenir entre 3 et 10 caractères alphanumériques"
              />
            </div>

            <div>
              <label htmlFor="adminEmail" className="text-gray-300 text-sm">
                Email de l'administrateur
              </label>
              <input
                id="adminEmail"
                name="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="adminLogin" className="text-gray-300 text-sm">
                Login de l'administrateur
              </label>
              <input
                id="adminLogin"
                name="adminLogin"
                type="text"
                value={formData.adminLogin}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="adminPassword" className="text-gray-300 text-sm">
                Mot de passe
              </label>
              <input
                id="adminPassword"
                name="adminPassword"
                type="password"
                value={formData.adminPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="adminFirstName" className="text-gray-300 text-sm">
                Prénom de l'administrateur
              </label>
              <input
                id="adminFirstName"
                name="adminFirstName"
                type="text"
                value={formData.adminFirstName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="adminLastName" className="text-gray-300 text-sm">
                Nom de l'administrateur
              </label>
              <input
                id="adminLastName"
                name="adminLastName"
                type="text"
                value={formData.adminLastName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Création en cours..." : "Créer le club"}
          </button>
        </form>

        <div className="text-center">
          <a
            href="/login"
            className="text-sm text-gray-400 hover:text-gray-300"
          >
            Déjà un compte ? Se connecter
          </a>
        </div>
      </div>
    </div>
  );
};

export default CreateClubPage;
