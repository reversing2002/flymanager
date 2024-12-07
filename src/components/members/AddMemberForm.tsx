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
      setGeneratedPassword(result.password);
      onSuccess();
    } catch (error) {
      console.error("Error creating member:", error);
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
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
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
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rôles</label>
            <div className="space-y-2">
              {["PILOT", "INSTRUCTOR", "MECHANIC"].map((role) => (
                <label key={role} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role)}
                    onChange={(e) => {
                      const newRoles = e.target.checked
                        ? [...formData.roles, role]
                        : formData.roles.filter((r) => r !== role);
                      setFormData({ ...formData, roles: newRoles });
                    }}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">{role.charAt(0) + role.slice(1).toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg disabled:opacity-50"
            >
              {loading ? "Création..." : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberForm;
