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
import EditLicenseForm from "./EditLicenseForm";
import MedicalCard from "./MedicalCard";
import ContributionCard from "./ContributionCard";
import QualificationsCard from "./QualificationsCard";
import LicensesCard from "./LicensesCard";
import CustomFieldsCard from "./CustomFieldsCard";
import NotificationPreferences from './NotificationPreferences';
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { toast } from "react-hot-toast";
import ActivityTimeline from "./ActivityTimeline";
import type { Medical } from "./MedicalCard";
import { getRoleLabel } from "../../lib/utils/roleUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "../../lib/supabase";
import FFACredentialsForm from "./FFACredentialsForm";
import FFPLUMCredentialsForm from "./FFPLUMCredentialsForm";
// import { BiometricAuth } from "../auth/BiometricAuth";

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

// Fonction utilitaire pour formater la date de naissance
const formatBirthDate = (date: string | null, hasFullAccess: boolean) => {
  if (!date) return "Non renseignée";
  const birthDate = new Date(date);
  if (hasFullAccess) {
    return birthDate.toLocaleDateString('fr-FR');
  }
  return birthDate.getFullYear().toString();
};

// Fonction utilitaire pour formater l'email
const formatEmail = (email: string | null, hasFullAccess: boolean) => {
  if (!email) return "Non renseigné";
  if (hasFullAccess) {
    return email;
  }
  // Masquer l'email en ne montrant que le domaine
  const [localPart, domain] = email.split('@');
  return `***@${domain}`;
};

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [pilot, setPilot] = useState<UserType | null>(null);
  const [medicals, setMedicals] = useState<Medical[]>([]);
  const [loadingMedicals, setLoadingMedicals] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [selectedMedical, setSelectedMedical] = useState<Medical | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isAddingLicense, setIsAddingLicense] = useState(false);
  const [isEditingLicense, setIsEditingLicense] = useState(false);
  const [isAddingMedical, setIsAddingMedical] = useState(false);
  const [isAddingContribution, setIsAddingContribution] = useState(false);
  const [isEditingQualifications, setIsEditingQualifications] = useState(false);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [isQualificationsModalOpen, setIsQualificationsModalOpen] = useState(false);
  const [showEditMedical, setShowEditMedical] = useState(false);

  const isAdmin = hasAnyGroup(currentUser, ["ADMIN"]);
  const isInstructor = hasAnyGroup(currentUser, ["INSTRUCTOR"]);
  const isOwnProfile = currentUser?.id === id;
  const canEdit = isAdmin || isInstructor || isOwnProfile;
  const canManageContributions = isAdmin || isInstructor;
  const hasFullAccess = isAdmin || isInstructor;

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
      
      // Charger les certificats médicaux
      setLoadingMedicals(true);
      try {
        if (!id) {
          console.warn("Pas d'ID utilisateur, impossible de charger les certificats médicaux");
          setMedicals([]);
          return;
        }

        const { data: medicalsData, error: medicalsError } = await supabase
          .from('medicals')
          .select('*, medical_types(*)')
          .eq('user_id', id)
          .order('obtained_at', { ascending: false });

        if (medicalsError) {
          console.error("Erreur lors du chargement des certificats médicaux:", medicalsError);
          setMedicals([]);
        } else {
          setMedicals(medicalsData || []);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des certificats médicaux:", err);
        setMedicals([]);
      } finally {
        setLoadingMedicals(false);
      }

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
      console.error(err);
      setError("Erreur lors du chargement des données");
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
        instructor_rate: formData.instructor_rate,
        instructor_fee: formData.instructor_fee
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
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button and edit */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Retour à la liste
          </button>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-8">
                <div className="flex items-center space-x-6">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden">
                    {pilot?.image_url ? (
                      <img
                        src={pilot.image_url}
                        alt={`Photo de ${pilot.first_name} ${pilot.last_name}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.classList.add('bg-gray-100');
                          e.currentTarget.parentElement?.classList.add('bg-gray-100');
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {pilot?.first_name} {pilot?.last_name}
                    </h1>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pilot?.roles?.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                            role
                          )}`}
                        >
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {pilot?.email ? (
                        <a href={`mailto:${formatEmail(pilot.email, hasFullAccess)}`} className="text-blue-600 hover:text-blue-800">
                          {formatEmail(pilot.email, hasFullAccess)}
                        </a>
                      ) : (
                        "Non renseigné"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {pilot?.phone ? (
                        <a href={`tel:${pilot.phone}`} className="text-blue-600 hover:text-blue-800">
                          {pilot.phone}
                        </a>
                      ) : (
                        "Non renseigné"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date de naissance</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatBirthDate(pilot.birth_date, hasFullAccess)}
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Licences */}
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Licences</h3>
                    {canEdit && (
                      <button
                        onClick={() => setIsAddingLicense(true)}
                        className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    <LicensesCard
                      userId={id || ""}
                      isEditModalOpen={isEditingLicense}
                      onOpenEditModal={() => setIsEditingLicense(true)}
                      onCloseEditModal={() => setIsEditingLicense(false)}
                      selectedLicense={selectedLicense}
                      onSelectLicense={setSelectedLicense}
                    />
                  </div>
                </div>
              </div>

              {/* Qualifications */}
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Qualifications</h3>
                    {canEdit && (
                      <button
                        onClick={() => setIsQualificationsModalOpen(true)}
                        className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    <QualificationsCard
                      userId={id || ""}
                      isEditModalOpen={isQualificationsModalOpen}
                      onOpenEditModal={() => setIsQualificationsModalOpen(true)}
                      onCloseEditModal={() => setIsQualificationsModalOpen(false)}
                    />
                  </div>
                </div>
              </div>

              {/* Certificats Médicaux */}
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Certificats Médicaux</h3>
                    {canEdit && (
                      <button
                        onClick={() => setIsAddingMedical(true)}
                        className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {loadingMedicals ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : medicals.length > 0 ? (
                      <div className="space-y-4">
                        {medicals.map((medical) => (
                          <MedicalCard
                            key={medical.id}
                            medical={medical}
                            onEdit={() => {
                              setSelectedMedical(medical);
                              setIsAddingMedical(true);
                            }}
                            canEdit={canEdit}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        Aucun certificat médical enregistré
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Champs personnalisés */}
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Champs personnalisés</h3>
                  </div>
                  <div className="p-4">
                    <CustomFieldsCard 
                      userId={id} 
                      clubId={currentUser?.club?.id} 
                      canEdit={canEdit} 
                    />
                  </div>
                </div>
              </div>

              {/* Préférences de notification */}
              {(hasAnyGroup(currentUser, ['ADMIN']) || currentUser?.id === pilot?.id) && (
                <NotificationPreferences 
                  userId={pilot?.id || ''} 
                  isEditable={true}
                />
              )}
            </div>

            {/* Section des identifiants SMILE FFA */}
            {(isAdmin || isOwnProfile) && (
              <FFACredentialsForm userId={id} />
            )}

            {/* Section des identifiants FFPLUM */}
            {(isAdmin || isOwnProfile) && (
              <FFPLUMCredentialsForm userId={id} />
            )}

            {/* Section de l'historique d'activité */}
            <ActivityTimeline userId={id} />

            {/* Contributions */}
            {canManageContributions && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Cotisations</h2>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddContribution(true)}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Nouvelle cotisation
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {loadingContributions ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    contributions.map((contribution) => (
                      <ContributionCard
                        key={contribution.id}
                        contribution={contribution}
                        onEdit={isAdmin ? () => setEditingContribution(contribution) : undefined}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Section d'authentification biométrique */}
            {/* Temporairement désactivé
            {isOwnProfile && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Authentification biométrique</h3>
                <BiometricAuth onSuccess={() => toast.success('Configuration biométrique mise à jour')} />
              </div>
            )}
            */}
          </div>
        )}
      </main>

      {/* Modals */}
      {(isAddingLicense || selectedLicense) && (
        <EditLicenseForm
          userId={id}
          currentLicense={selectedLicense}
          onClose={() => {
            setIsAddingLicense(false);
            setSelectedLicense(null);
          }}
        />
      )}

      {(isAddingMedical || selectedMedical) && (
        <EditMedicalForm
          userId={id}
          medical={selectedMedical}
          onClose={() => {
            setIsAddingMedical(false);
            setSelectedMedical(null);
          }}
        />
      )}

      {showAddContribution && (
        <EditContributionForm
          userId={id}
          onClose={() => setShowAddContribution(false)}
          onSuccess={loadContributions}
        />
      )}

      {editingContribution && (
        <EditContributionForm
          userId={id}
          currentContribution={editingContribution}
          onClose={() => setEditingContribution(null)}
          onSuccess={loadContributions}
        />
      )}

      {isEditingQualifications && (
        <EditQualificationsForm
          userId={id}
          onClose={() => setIsEditingQualifications(false)}
        />
      )}
      
      {isEditingLicense && selectedLicense && (
        <EditLicenseForm
          userId={id}
          onClose={() => {
            setIsEditingLicense(false);
            setSelectedLicense(null);
          }}
          onSuccess={() => {
            loadData();
            setIsEditingLicense(false);
            setSelectedLicense(null);
          }}
          currentLicense={selectedLicense}
        />
      )}
      
      {showEditMedical && (
        <EditMedicalForm
          userId={id}
          medical={selectedMedical}
          onClose={() => {
            setShowEditMedical(false);
            setSelectedMedical(null);
          }}
        />
      )}
    </div>
  );
};

export default MemberProfile;