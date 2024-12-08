import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Logo } from "../common/Logo";

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
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
    }
  };

  const handleTestAccountSelect = (account: TestAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setShowTestAccounts(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1d21] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Logo className="mb-2" />
          <p className="text-gray-400 text-sm">Pilotez facilement votre aéroclub</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="text-gray-300 text-sm">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="text-gray-300 text-sm">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#2a2e33] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Se connecter
          </button>
        </form>

        <div className="text-center space-y-2">
          <a
            href="/create-club"
            className="block text-sm text-blue-400 hover:text-blue-300"
          >
            Créer un nouveau club
          </a>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTestAccounts(!showTestAccounts)}
              className="w-full flex items-center justify-center space-x-2 text-gray-400 text-sm hover:text-gray-300"
            >
              <span>Comptes de test</span>
              <ChevronDown className={`w-4 h-4 transform transition-transform ${showTestAccounts ? 'rotate-180' : ''}`} />
            </button>

            {showTestAccounts && (
              <div className="absolute w-full mt-2 py-2 bg-[#2a2e33] border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {testAccounts.map((account, index) => (
                  <button
                    key={index}
                    onClick={() => handleTestAccountSelect(account)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                  >
                    {account.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
