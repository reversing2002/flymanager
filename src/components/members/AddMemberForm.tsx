import { useState, useEffect } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { adminService } from "../../lib/supabase/adminClient";

const memberFormSchema = z.object({
  email: z.string().email("Email invalide"),
  firstName: z.string().min(2, "Prénom trop court"),
  lastName: z.string().min(2, "Nom trop court"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
});

type MemberFormData = z.infer<typeof memberFormSchema>;

interface AddMemberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddMemberForm = ({ isOpen, onClose, onSuccess }: AddMemberFormProps) => {
  const { user } = useAuth();
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  // Générer un mot de passe au chargement du composant
  useEffect(() => {
    if (isOpen) {
      const newPassword = Math.random().toString(36).slice(-8);
      setGeneratedPassword(newPassword);
      form.setValue('password', newPassword);
    }
  }, [isOpen, form]);

  const handleSubmit = async (data: MemberFormData) => {
    console.log("=== Début de handleSubmit ===");
    console.log("FormData:", data);
    console.log("User:", user);
    setLoading(true);

    try {
      if (!user?.club?.id) {
        throw new Error("Aucun club sélectionné");
      }

      const clubId = user.club.id;
      console.log("Club ID:", clubId);

      // Générer un login basé sur le prénom et le nom
      const login = `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}`;

      // Utiliser le mot de passe du formulaire
      const password = data.password;

      console.log("Appel de adminService.createUser avec:", {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        login,
        clubId,
        password: "********", // Ne pas logger le vrai mot de passe
      });

      const result = await adminService.createUser({
        email: data.email,
        password,
        userData: {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          login: login,
        },
        roles: ["USER"],
        clubId: clubId,
      });

      console.log("Résultat:", result);

      if (result && result.user) {
        setShowSuccess(true);
        toast.success("Membre créé avec succès");
        // Ne pas appeler onSuccess ici car on veut d'abord montrer l'écran avec les infos
      } else {
        throw new Error("Erreur lors de la création de l'utilisateur");
      }
    } catch (error: any) {
      console.error("Erreur complète:", error);
      if (error.message.includes("duplicate key") || error.message.includes("already exists")) {
        toast.error("Un utilisateur avec cet email existe déjà");
      } else {
        toast.error(error.message || "Erreur lors de la création du membre");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setGeneratedPassword(null);
    setShowSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  if (showSuccess) {
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
              <p><strong>Email :</strong> {form.getValues("email")}</p>
              <p><strong>Login :</strong> {form.getValues("firstName").toLowerCase()}.{form.getValues("lastName").toLowerCase()}</p>
              <p><strong>Mot de passe :</strong> {form.getValues("password")}</p>
            </div>
            <p className="text-sm text-slate-500">Veuillez communiquer ces informations au membre de manière sécurisée.</p>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => {
                onSuccess();
                handleClose();
              }}
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

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Prénom
            </label>
            <input
              type="text"
              id="firstName"
              {...form.register("firstName")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
            {form.formState.errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Nom
            </label>
            <input
              type="text"
              id="lastName"
              {...form.register("lastName")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
            {form.formState.errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              {...form.register("email")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe (optionnel)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                {...form.register("password")}
                placeholder="Laissez vide pour générer automatiquement"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberForm;
