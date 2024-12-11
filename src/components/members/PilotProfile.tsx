import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { User, AlertTriangle, Edit } from "lucide-react";
import {
  getUserById,
  getUserLicenses,
  getUserQualifications,
  updateUser,
  updatePilotLicenses,
  updatePilotQualifications,
} from "../../lib/queries";
import { hasAnyGroup } from "../../lib/permissions";
import type { User as UserType } from "../../types/database";
import EditPilotForm from "./EditPilotForm";
import { useAuth } from "../../contexts/AuthContext";
const PilotProfile = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pilot, setPilot] = useState<UserType | null>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const isAdmin = hasAnyGroup(user, ["ADMIN"]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError("ID du pilote non spécifié");
        setLoading(false);
        return;
      }

      try {
        const [pilotData, licensesData, qualificationsData] = await Promise.all(
          [getUserById(id), getUserLicenses(id), getUserQualifications(id)]
        );

        if (!pilotData) {
          setError("Pilote non trouvé");
          setLoading(false);
          return;
        }

        setPilot(pilotData);
        setLicenses(licensesData);
        setQualifications(qualificationsData);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleUpdateProfile = async (formData: any) => {
    if (!pilot || !id) return;

    try {
      console.log("[PilotProfile] ====== UPDATE DEBUG ======");
      console.log("[PilotProfile] Received form data:", formData);
      console.log("[PilotProfile] Received instructor_rate:", formData.instructor_rate, typeof formData.instructor_rate);
      console.log("[PilotProfile] Full received data:", JSON.stringify(formData, null, 2));

      const dataToUpdate = {
        id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        birth_date: formData.birth_date,
        image_url: formData.image_url,
        instructor_rate: formData.instructor_rate,
        instructor_fee: formData.instructor_fee,
        roles: formData.roles,
      };

      console.log("[PilotProfile] Data to update:", dataToUpdate);
      console.log("[PilotProfile] Update instructor_rate:", dataToUpdate.instructor_rate, typeof dataToUpdate.instructor_rate);
      console.log("[PilotProfile] Full update data:", JSON.stringify(dataToUpdate, null, 2));

      await updateUser(dataToUpdate);

      const updatedPilot = await getUserById(id);
      setPilot(updatedPilot);
      setIsEditing(false);
    } catch (err) {
      console.error("[PilotProfile] Error updating profile:", err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-slate-200 rounded-xl"></div>
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-slate-200 rounded-xl"></div>
              <div className="h-48 bg-slate-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pilot) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error || "Une erreur est survenue"}</p>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Modifier le profil</h2>
          <EditPilotForm
            pilot={pilot}
            licenses={licenses}
            qualifications={qualifications}
            onSubmit={handleUpdateProfile}
            onCancel={() => setIsEditing(false)}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne de gauche - Informations principales */}
        <div className="lg:w-1/3 space-y-6">
          {/* Carte de profil */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Modifier</span>
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4 overflow-hidden">
                {pilot.imageUrl ? (
                  <img
                    src={pilot.imageUrl}
                    alt={`${pilot.firstName} ${pilot.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-slate-600" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {pilot.firstName} {pilot.lastName}
              </h1>
              <span className="inline-block px-3 py-1 bg-sky-100 text-sky-800 text-sm font-medium rounded-full mt-2">
                {pilot.role}
              </span>
              <div className="mt-4 text-sm text-slate-600">
                <p>
                  Inscrit depuis le{" "}
                  {new Date(pilot.registrationDate || "").toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Genre</span>
                <span className="font-medium">{pilot.gender}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Date de naissance</span>
                <span className="font-medium">
                  {pilot.birthDate
                    ? new Date(pilot.birthDate).toLocaleDateString()
                    : "Non renseigné"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Planning par défaut</span>
                <span className="font-medium">
                  {pilot.defaultSchedule || "Non défini"}
                </span>
              </div>
            </div>
          </div>

          {/* Reste du contenu de la colonne de gauche */}
          {/* ... */}
        </div>

        {/* Colonne de droite - Contenu principal */}
        <div className="lg:flex-1 space-y-6">
          {/* ... Reste du contenu ... */}
        </div>
      </div>
    </div>
  );
};

export default PilotProfile;
