import { useState } from "react";
import { X } from "lucide-react";
import { createMember } from "../../lib/queries/users";

interface AddMemberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddMemberForm = ({ isOpen, onClose, onSuccess }: AddMemberFormProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    roles: [] as string[],
  });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createMember(formData);
      if (result && result.password) {
        setGeneratedPassword(result.password);
      } else {
        console.error("No password returned from createMember");
        throw new Error("No password generated");
      }
    } catch (error) {
      console.error("Error creating member:", error);
      // TODO: Add error notification here
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGeneratedPassword(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      roles: [],
    });
    onClose();
  };

  if (!isOpen) return null;

  if (generatedPassword) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Membre créé avec succès</h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <p>Le membre a été créé avec succès. Voici les informations de connexion :</p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p><strong>Email :</strong> {formData.email}</p>
              <p><strong>Login :</strong> {formData.firstName.toLowerCase()}.{formData.lastName.toLowerCase()}</p>
              <p><strong>Mot de passe :</strong> {generatedPassword}</p>
            </div>
            <p className="text-sm text-slate-500">Veuillez communiquer ces informations au membre de manière sécurisée.</p>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Ajouter un membre</h2>
          <button 
            onClick={handleClose} 
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
              Prénom
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
              Nom
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="roles" className="block text-sm font-medium text-slate-700 mb-1">
              Rôles
            </label>
            <select
              id="roles"
              value={formData.roles[0] || ""}
              onChange={(e) => setFormData({ ...formData, roles: [e.target.value] })}
              className="w-full rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              disabled={loading}
              required
            >
              <option value="">Sélectionner un rôle</option>
              <option value="PILOT">Pilote</option>
              <option value="STUDENT">Élève</option>
              <option value="INSTRUCTOR">Instructeur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? "Création en cours..." : "Créer le membre"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberForm;
