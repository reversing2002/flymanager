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
} from "lucide-react";
import AnnouncementList from "../announcements/AnnouncementList";
import AnnouncementForm from "../announcements/AnnouncementForm";
import AccountTypesSettings from "../settings/AccountTypesSettings";
import ClubManagement from "../settings/ClubManagement";
import QualificationTypesSettings from "../settings/QualificationTypesSettings";
import LicenseTypesSettings from "../settings/LicenseTypesSettings";
import MedicalTypesSettings from "../settings/MedicalTypesSettings";
import CustomMemberFieldsSettings from "../settings/CustomMemberFieldsSettings";
import CustomAircraftFieldsSettings from "../settings/CustomAircraftFieldsSettings";
import type { Announcement } from "../../types/database";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import ApiExplorer from "../api/ApiExplorer";
import FlightTypeManager from "./FlightTypeManager";
import AccountingCategoryManager from "./AccountingCategoryManager";
import ImportManager from "./imports/ImportManager";

type TabType =
  | "club"
  | "announcements"
  | "imports"
  | "flightTypes"
  | "accountTypes"
  | "accountingCategories"
  | "qualifications"
  | "licenses"
  | "medicalTypes"
  | "memberFields"
  | "aircraftFields"
  | "api";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("club");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  const tabs = [
    // Gestion du club
    { id: "club", label: "Club", icon: Building },
    { id: "announcements", label: "Annonces", icon: Megaphone },
    // Imports
    { id: "imports", label: "Imports", icon: Upload },
    // Configuration
    { id: "flightTypes", label: "Types de vol", icon: ListOrdered },
    { id: "accountTypes", label: "Types de compte", icon: Receipt },
    { id: "accountingCategories", label: "Catégories comptables", icon: Calculator },
    { id: "qualifications", label: "Qualifications", icon: Award },
    { id: "licenses", label: "Licences", icon: BookOpen },
    { id: "medicalTypes", label: "Types médicaux", icon: Heart },
    { id: "memberFields", label: "Champs membres", icon: UserCog },
    { id: "aircraftFields", label: "Champs avions", icon: Plane },
    { id: "api", label: "API", icon: Terminal },
  ] as const;

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

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowAnnouncementForm(true);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette annonce ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Annonce supprimée");
    } catch (err) {
      console.error("Error deleting announcement:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-600">Configuration et imports</p>
        </div>

        <div className="border-b overflow-x-auto">
          <nav className="flex -mb-px min-w-full">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "club" && <ClubManagement />}
          {activeTab === "announcements" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Annonces du club</h2>
                <button
                  onClick={() => setShowAnnouncementForm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Megaphone className="h-4 w-4" />
                  <span>Nouvelle annonce</span>
                </button>
              </div>

              <AnnouncementList
                announcements={announcements}
                onEdit={handleEditAnnouncement}
                onDelete={handleDeleteAnnouncement}
              />

              {showAnnouncementForm && (
                <AnnouncementForm
                  announcement={editingAnnouncement}
                  onClose={() => {
                    setShowAnnouncementForm(false);
                    setEditingAnnouncement(null);
                  }}
                  onSuccess={() => {
                    setShowAnnouncementForm(false);
                    setEditingAnnouncement(null);
                    loadAnnouncements();
                  }}
                />
              )}
            </div>
          )}
          {activeTab === "imports" && <ImportManager />}
          {activeTab === "flightTypes" && <FlightTypeManager />}
          {activeTab === "accountTypes" && <AccountTypesSettings />}
          {activeTab === "accountingCategories" && <AccountingCategoryManager />}
          {activeTab === "qualifications" && <QualificationTypesSettings />}
          {activeTab === "licenses" && <LicenseTypesSettings />}
          {activeTab === "medicalTypes" && <MedicalTypesSettings />}
          {activeTab === "memberFields" && <CustomMemberFieldsSettings />}
          {activeTab === "aircraftFields" && <CustomAircraftFieldsSettings />}
          {activeTab === "api" && <ApiExplorer />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
