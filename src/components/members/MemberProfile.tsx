import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, AlertTriangle, Edit, ChevronLeft, CreditCard, Plus } from "lucide-react";
import { getUserById, updateUser } from "../../lib/queries";
import type { User as UserType } from "../../types/database";
import type { Contribution } from "../../types/contribution";
import { getContributionsByUserId } from "../../lib/queries/contributions";
import EditPilotForm from "./EditPilotForm";
import EditMedicalForm from "./EditMedicalForm";
import EditContributionForm from "./EditContributionForm";
import EditQualificationsForm from "./EditQualificationsForm";
import MedicalCard from "./MedicalCard";
import ContributionCard from "./ContributionCard";
import QualificationsCard from "./QualificationsCard";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { toast } from "react-hot-toast";
import ActivityTimeline from "./ActivityTimeline";
import LicenseCard from "./LicenseCard";
import type { License } from "./LicenseCard";
import type { Medical } from "./MedicalCard";
import { getRoleLabel } from "../../lib/utils/roleUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const getRoleBadgeColor = (role: Role) => {
  switch (role) {
    case "PILOT":
      return "bg-sky-100 text-sky-800";
    case "INSTRUCTOR":
      return "bg-green-100 text-green-800";
    case "ADMIN":
      return "bg-purple-100 text-purple-800";
    case "MECHANIC":
      return "bg-orange-100 text-orange-800";
    case "STUDENT":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [pilot, setPilot] = useState<UserType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [selectedMedical, setSelectedMedical] = useState<Medical | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isAddingLicense, setIsAddingLicense] = useState(false);
  const [isAddingMedical, setIsAddingMedical] = useState(false);
  const [isAddingContribution, setIsAddingContribution] = useState(false);
  const [isEditingQualifications, setIsEditingQualifications] = useState(false);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);

  const isAdmin = hasAnyGroup(currentUser, ["ADMIN"]);
  const isInstructor = hasAnyGroup(currentUser, ["INSTRUCTOR"]);
  const canEdit = isAdmin || isInstructor;
  const isOwnProfile = currentUser?.id === id;
  const canManageContributions = isAdmin || isInstructor;

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) {
      setError("ID du membre non spécifié");
      setLoading(false);
      return;
    }

    try {
      const pilotData = await getUserById(id);

      if (!pilotData) {
        setError("Membre non trouvé");
        setLoading(false);
        return;
      }

      setPilot(pilotData);
      
      // Charger les cotisations
      setLoadingContributions(true);
      try {
        const contributionsData = await getContributionsByUserId(id);
        setContributions(contributionsData);
      } catch (err) {
        console.error("Erreur lors du chargement des cotisations:", err);
      } finally {
        setLoadingContributions(false);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError("Erreur lors du chargement des données");
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (formData: any) => {
    if (!pilot || !id || (!isAdmin && !isInstructor && !isOwnProfile)) return;

    try {
      await updateUser({
        id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        birth_date: formData.birth_date,
        image_url: formData.image_url,
        default_schedule: formData.default_schedule,
        instructor_rate: formData.instructor_rate,
        role: formData.role,
      });

      await loadData();
      setIsEditing(false);
      toast.success("Profil mis à jour avec succès");
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const loadContributions = async () => {
    setLoadingContributions(true);
    try {
      const contributionsData = await getContributionsByUserId(pilot.id);
      setContributions(contributionsData);
    } catch (err) {
      console.error("Erreur lors du chargement des cotisations:", err);
    } finally {
      setLoadingContributions(false);
    }
  };

  const handleEditContribution = (contribution: Contribution) => {
    setEditingContribution(contribution);
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
            onSubmit={handleUpdateProfile}
            onCancel={() => setIsEditing(false)}
            isAdmin={isAdmin}
            currentUser={currentUser}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => navigate("/members")}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ChevronLeft className="h-5 w-5" />
        <span>Retour à la liste</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {(canEdit || isOwnProfile) && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Modifier</span>
                </button>
              </div>
            )}

            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                {pilot.image_url ? (
                  <img
                    src={pilot.image_url}
                    alt={`${pilot.first_name} ${pilot.last_name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-slate-600" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {pilot.first_name} {pilot.last_name}
              </h1>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">Rôles</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pilot.roles?.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                    >
                      {getRoleLabel(role)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Email</span>
                <span className="font-medium">{pilot.email}</span>
              </div>
              {pilot.phone && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Téléphone</span>
                  <span className="font-medium">{pilot.phone}</span>
                </div>
              )}
              {pilot.birth_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Date de naissance</span>
                  <span className="font-medium">
                    {new Date(pilot.birth_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {/* Afficher le tarif horaire pour les instructeurs (visible uniquement par les admins) */}
              {isAdmin && pilot?.roles?.includes("INSTRUCTOR") && (
                <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                  <dt className="text-sm font-medium text-gray-500">Tarif horaire d'instruction</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {pilot.instructor_rate ? (
                      <span>{pilot.instructor_rate.toFixed(2)} €/h</span>
                    ) : (
                      <span className="text-gray-400">Non défini</span>
                    )}
                  </dd>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LicenseCard
              userId={pilot.id}
              onAddLicense={() => setIsAddingLicense(true)}
              onEditLicense={setSelectedLicense}
            />
            <MedicalCard
              userId={pilot.id}
              onAddMedical={() => setIsAddingMedical(true)}
              onEditMedical={setSelectedMedical}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 rounded-lg">
                  <CreditCard className="h-4 w-4 text-sky-700" />
                </div>
                <h2 className="text-lg font-semibold">Cotisations</h2>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddContribution(true)}
                  className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              )}
            </div>

            {loadingContributions ? (
              <div>Chargement...</div>
            ) : contributions.length === 0 ? (
              <div className="text-sm text-slate-500">Aucune cotisation enregistrée</div>
            ) : (
              <div className="space-y-4">
                {contributions.map((contribution) => (
                  <ContributionCard
                    key={contribution.id}
                    contribution={contribution}
                    onEdit={handleEditContribution}
                    canEdit={isAdmin}
                  />
                ))}
              </div>
            )}
          </div>

          <QualificationsCard
            userId={pilot.id}
            onEdit={canEdit ? () => setIsEditingQualifications(true) : undefined}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Activité récente</h2>
            <ActivityTimeline userId={pilot.id} />
          </div>
        </div>
      </div>

      {(isAddingLicense || selectedLicense) && (
        <EditLicenseForm
          userId={pilot.id}
          license={selectedLicense}
          onClose={() => {
            setIsAddingLicense(false);
            setSelectedLicense(null);
          }}
        />
      )}

      {(isAddingMedical || selectedMedical) && (
        <EditMedicalForm
          userId={pilot.id}
          medical={selectedMedical}
          onClose={() => {
            setIsAddingMedical(false);
            setSelectedMedical(null);
          }}
        />
      )}

      {showAddContribution && (
        <EditContributionForm
          userId={pilot.id}
          onClose={() => setShowAddContribution(false)}
          onSuccess={loadContributions}
        />
      )}

      {editingContribution && (
        <EditContributionForm
          userId={pilot.id}
          currentContribution={editingContribution}
          onClose={() => setEditingContribution(null)}
          onSuccess={loadContributions}
        />
      )}

      {isEditingQualifications && (
        <EditQualificationsForm
          userId={pilot.id}
          onClose={() => setIsEditingQualifications(false)}
        />
      )}
    </div>
  );
};

export default MemberProfile;