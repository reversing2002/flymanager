import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { Plane, AlertTriangle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface TestAccount {
  title: string;
  email: string;
  password: string;
}

const testAccounts: TestAccount[] = [
  {
    title: "Administrateur Système",
    email: "admin@skyprout.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Instructeur Paris - Marie Martin",
    email: "instructor@skyprout.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Pilote Paris - Jean Dupont",
    email: "pilot@skyprout.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Mécanicien Paris - Pierre Dubois",
    email: "mechanic@skyprout.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Instructeur Lyon - Sophie Laurent",
    email: "sophie.laurent@skyprout.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Pilote Lyon - Lucas Bernard",
    email: "lucas.bernard@skyprout.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Instructeur Bordeaux - Emma Petit",
    email: "emma.petit@skyprout.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Pilote Bordeaux - Thomas Roux",
    email: "thomas.roux@skyprout.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Administrateur Saint Chamond - Pascal Descombe",
    email: "pascal.descombe@ac-stchamond.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Mécanicien Saint Chamond - André Jacoud",
    email: "andre.jacoud@ac-stchamond.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Pilote Saint Chamond - Eddy Fayet",
    email: "eddy.fayet@ac-stchamond.fr",
    password: "TemporaryPassword123!",
  },
  {
    title: "Instructeur Saint Chamond - Nicolas Becuwe",
    email: "nicolas.becuwe@ac-stchamond.fr",
    password: "TemporaryPassword123!",
  },
];

const LoginPage = () => {
  const { user, signIn, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    console.log("Utilisateur déjà connecté:", user);
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Tentative de connexion avec:", { email, password });
      console.log("Configuration Supabase:", {
        url: process.env.REACT_APP_SUPABASE_URL,
        hasAnon: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      });
      const result = await signIn(email, password);
      console.log("Résultat de la connexion:", result);
    } catch (error) {
      console.error("Erreur détaillée lors de la connexion:", {
        error,
        message: error instanceof Error ? error.message : "Erreur inconnue",
        stack: error instanceof Error ? error.stack : undefined,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  };

  const handleTestAccountClick = async (account: TestAccount) => {
    if (loading) return;
    try {
      console.log("Tentative de connexion avec compte test:", {
        email: account.email,
        password: account.password,
      });
      const result = await signIn(account.email, account.password);
      console.log("Résultat de la connexion test:", result);
    } catch (error) {
      console.error("Erreur détaillée lors de la connexion test:", {
        account: account.title,
        error,
        message: error instanceof Error ? error.message : "Erreur inconnue",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  console.log("État actuel:", { loading, error, user });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Plane className="h-12 w-12 text-sky-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          4fly
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Pilotez facilement votre aéroclub
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">
                    Comptes de test
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 text-sm">
                {testAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleTestAccountClick(account)}
                    disabled={loading}
                    className="rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                  >
                    <p className="font-medium text-slate-900">
                      {account.title}
                    </p>
                    <p className="text-slate-500">
                      Email: {account.email} / Password: {account.password}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
