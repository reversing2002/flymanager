import { useState, useEffect } from "react";
import {
  Plane,
  CreditCard,
  Users,
  Plane as PlaneSolid,
  Megaphone,
  Terminal,
  ListOrdered,
  Receipt,
  Calculator,
} from "lucide-react";
import FlightImportTab from "./imports/FlightImportTab";
import AccountImportTab from "./imports/AccountImportTab";
import MemberImportTab from "./imports/MemberImportTab";
import AircraftImportTab from "./imports/AircraftImportTab";
import AnnouncementList from "../announcements/AnnouncementList";
import AnnouncementForm from "../announcements/AnnouncementForm";
import AccountTypesSettings from "../settings/AccountTypesSettings";
import type { Announcement } from "../../types/database";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import ApiExplorer from "../api/ApiExplorer";
import FlightTypeManager from "./FlightTypeManager";
import AccountingCategoryManager from "./AccountingCategoryManager";

type TabType =
  | "flights"
  | "accounts"
  | "members"
  | "aircraft"
  | "announcements"
  | "api"
  | "flightTypes"
  | "accountTypes"
  | "accountingCategories";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("flights");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  const tabs = [
    { id: "flights", label: "Vols", icon: Plane },
    { id: "accounts", label: "Comptes", icon: CreditCard },
    { id: "members", label: "Membres", icon: Users },
    { id: "aircraft", label: "Avions", icon: PlaneSolid },
    { id: "announcements", label: "Annonces", icon: Megaphone },
    { id: "flightTypes", label: "Types de vol", icon: ListOrdered },
    { id: "accountingCategories", label: "Catégories comptables", icon: Calculator },
    { id: "accountTypes", label: "Types d'opérations", icon: Receipt },
    { id: "api", label: "API Explorer", icon: Terminal },
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

        <div className="border-b">
          <nav className="flex -mb-px">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab !== "announcements" && 
           activeTab !== "api" && 
           activeTab !== "flightTypes" &&
           activeTab !== "accountTypes" &&
           activeTab !== "accountingCategories" && (
            <div className="mb-6 p-4 bg-sky-50 text-sky-800 rounded-lg">
              <h3 className="font-medium mb-2">Ordre d'import recommandé :</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Appareils</li>
                <li>Membres</li>
                <li>Opérations comptables</li>
                <li>Vols</li>
              </ol>
            </div>
          )}

          {activeTab === "flights" && <FlightImportTab />}
          {activeTab === "accounts" && <AccountImportTab />}
          {activeTab === "members" && <MemberImportTab />}
          {activeTab === "aircraft" && <AircraftImportTab />}
          {activeTab === "api" && <ApiExplorer />}
          {activeTab === "flightTypes" && <FlightTypeManager />}
          {activeTab === "accountTypes" && <AccountTypesSettings />}
          {activeTab === "accountingCategories" && <AccountingCategoryManager />}
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
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
