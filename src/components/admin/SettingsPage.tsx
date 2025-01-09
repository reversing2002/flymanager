import { useState, useEffect } from "react";
import {
  Building,
  Megaphone,
  Terminal,
  ListOrdered,
  Receipt,
  Calculator,
  Upload,
  Award,
  BookOpen,
  Heart,
  UserCog,
  Plane,
  Users,
  Lock,
  Bell,
  DatabaseBackup,
  Briefcase,
  FileText,
  User,
  Building2,
  Clock,
  Shield,
  Cloud,
  ChevronDown,
  ArrowRightLeft,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import AnnouncementList from "../announcements/AnnouncementList";
import AnnouncementForm from "../announcements/AnnouncementForm";
import AccountTypesSettings from "../settings/AccountTypesSettings";
import ClubManagement from "../settings/ClubManagement";
import QualificationTypesSettings from "../settings/QualificationTypesSettings";
import LicenseTypesSettings from "../settings/LicenseTypesSettings";
import MedicalTypesSettings from "../settings/MedicalTypesSettings";
import CustomMemberFieldsSettings from "../settings/CustomMemberFieldsSettings";
import CustomAircraftFieldsSettings from "../settings/CustomAircraftFieldsSettings";
import CustomFlightFieldsSettings from "../settings/CustomFlightFieldsSettings";
import RolesSettings from "../settings/RolesSettings";
import PagePermissionsSettings from "../settings/PagePermissionsSettings";
import BackupSettings from "../settings/BackupSettings";
import SmileSettings from "../settings/SmileSettings";
import AccountingMigrationSettings from "../settings/AccountingMigrationSettings";
import StripeAccountSettings from "../settings/StripeAccountSettings";
import type { Announcement } from "../../types/database";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import ApiExplorer from "../api/ApiExplorer";
import FlightTypeManager from "./FlightTypeManager";
import AccountingCategoryManager from "./AccountingCategoryManager";
import ImportManager from "./imports/ImportManager";
import NotificationList from "./NotificationList";
import WeatherSettings from "./WeatherSettings";
import AdminTestPage from "../../pages/settings/AdminTestPage";

type TabType =
  | "club"
  | "announcements"
  | "imports"
  | "flightTypes"
  | "accountTypes"
  | "accountingCategories"
  | "accountingMigration"
  | "stripeAccount"
  | "qualifications"
  | "licenses"
  | "medicalTypes"
  | "memberFields"
  | "aircraftFields"
  | "flightFields"
  | "roles"
  | "permissions"
  | "notifications"
  | "api"
  | "backups"
  | "weather"
  | "smile"
  | "adminTest";

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("club");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    // Gestion du club
    { id: "club", label: "Club", icon: Building },
    { id: "announcements", label: "Annonces", icon: Megaphone },
    // Imports
    { id: "imports", label: "Imports", icon: Upload },
    // Configuration
    { id: "weather", label: "Seuils météo", icon: Cloud },
    { id: "flightTypes", label: "Types de vol", icon: ListOrdered },
    { id: "accountTypes", label: "Types de compte", icon: Receipt },
    { id: "accountingCategories", label: "Catégories comptables", icon: Calculator },
    { id: "accountingMigration", label: "Migration comptable", icon: ArrowRightLeft },
    { id: "stripeAccount", label: "Compte Stripe", icon: CreditCard },
    // Qualifications et licences
    { id: "qualifications", label: "Qualifications", icon: Award },
    { id: "licenses", label: "Licences", icon: BookOpen },
    { id: "medicalTypes", label: "Types médicaux", icon: Heart },
    // Champs personnalisés
    { id: "memberFields", label: "Champs membres", icon: UserCog },
    { id: "aircraftFields", label: "Champs avions", icon: Plane },
    { id: "flightFields", label: "Champs vols", icon: FileText },
    // Rôles et permissions
    { id: "roles", label: "Rôles", icon: Users },
    { id: "permissions", label: "Permissions", icon: Lock },
    // Autres
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "api", label: "API", icon: Terminal },
    { id: "backups", label: "Sauvegardes", icon: DatabaseBackup },
    { id: "smile", label: "SMILE", icon: Building2 },
    // Tests admin
    { id: "adminTest", label: "Tests Admin", icon: Shield },
  ] as const;

  // Filtrer les onglets en fonction des permissions
  const availableTabs = tabs.filter(tab => {
    if (tab.id === "api") {
      return user && hasAnyGroup(user, ["superadmin"]);
    }
    return true;
  });

  useEffect(() => {
    // Si l'onglet actif n'est pas disponible pour l'utilisateur, rediriger vers "club"
    if (activeTab === "api" && (!user || !hasAnyGroup(user, ["superadmin"]))) {
      setActiveTab("club");
      toast.error("Accès non autorisé. Seuls les super-administrateurs peuvent accéder à cette page.");
    }
  }, [activeTab, user]);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAnnouncements(data);
    }
  };

  const handleAnnouncementSave = async (announcement: Partial<Announcement>) => {
    try {
      if (editingAnnouncement) {
        // Mise à jour
        const { error } = await supabase
          .from('announcements')
          .update({
            ...announcement,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast.success('Annonce mise à jour');
      } else {
        // Création
        const { error } = await supabase
          .from('announcements')
          .insert({
            ...announcement,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        toast.success('Annonce créée');
      }

      setShowAnnouncementForm(false);
      setEditingAnnouncement(null);
      loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Erreur lors de la sauvegarde de l\'annonce');
    }
  };

  const handleAnnouncementDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Annonce supprimée');
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Erreur lors de la suppression de l\'annonce');
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowAnnouncementForm(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Building2 className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px,1fr] gap-8">
        {/* Menu mobile */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium bg-white border rounded-lg shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              {(() => {
                const activeTabData = availableTabs.find(tab => tab.id === activeTab);
                if (activeTabData) {
                  const Icon = activeTabData.icon;
                  return <Icon className="h-4 w-4" />;
                }
                return null;
              })()}
              <span>{availableTabs.find(tab => tab.id === activeTab)?.label}</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute z-10 mt-2 w-[calc(100%-2rem)] bg-white border rounded-lg shadow-lg">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as TabType);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-medium ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Menu desktop */}
        <div className="hidden lg:block space-y-1">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenu */}
        <div className="bg-white rounded-xl shadow-sm">
          {activeTab === "club" && <ClubManagement />}
          {activeTab === "announcements" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Annonces</h2>
                <button
                  onClick={() => {
                    setEditingAnnouncement(null);
                    setShowAnnouncementForm(true);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Nouvelle annonce
                </button>
              </div>

              {showAnnouncementForm && (
                <AnnouncementForm
                  onClose={() => setShowAnnouncementForm(false)}
                  onSave={handleAnnouncementSave}
                  announcement={editingAnnouncement}
                />
              )}

              <AnnouncementList
                announcements={announcements}
                onEdit={(announcement) => {
                  setEditingAnnouncement(announcement);
                  setShowAnnouncementForm(true);
                }}
                onDelete={handleAnnouncementDelete}
              />
            </div>
          )}
          {activeTab === "imports" && <ImportManager />}
          {activeTab === "weather" && <WeatherSettings />}
          {activeTab === "flightTypes" && <FlightTypeManager />}
          {activeTab === "accountTypes" && <AccountTypesSettings />}
          {activeTab === "accountingCategories" && <AccountingCategoryManager />}
          {activeTab === "accountingMigration" && (
            <div className="space-y-4">
              <AccountingMigrationSettings />
            </div>
          )}
          {activeTab === "stripeAccount" && <StripeAccountSettings />}
          {activeTab === "qualifications" && <QualificationTypesSettings />}
          {activeTab === "licenses" && <LicenseTypesSettings />}
          {activeTab === "medicalTypes" && <MedicalTypesSettings />}
          {activeTab === "memberFields" && <CustomMemberFieldsSettings />}
          {activeTab === "aircraftFields" && <CustomAircraftFieldsSettings />}
          {activeTab === "flightFields" && <CustomFlightFieldsSettings />}
          {activeTab === "roles" && <RolesSettings />}
          {activeTab === "permissions" && <PagePermissionsSettings />}
          {activeTab === "notifications" && <NotificationList />}
          {activeTab === "smile" && <SmileSettings />}
          {activeTab === "api" && <ApiExplorer />}
          {activeTab === "backups" && <BackupSettings />}
          {activeTab === "adminTest" && <AdminTestPage />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
