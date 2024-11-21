import React, { useState, useEffect } from "react";
import {
  Plane,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  RotateCcw,
} from "lucide-react";
import {
  getAircraft,
  getUsers,
  getReservations,
  getFlights,
} from "../lib/queries";
import type {
  Aircraft,
  User,
  Reservation,
  Flight,
  Announcement,
} from "../types/database";
import { useAuth } from "../contexts/AuthContext";
import EditReservationModal from "./reservations/EditReservationModal";
import AnnouncementBanner from "./announcements/AnnouncementBanner";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";

const StatCard = ({
  icon,
  title,
  value,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  color: string;
}) => (
  <div className={`rounded-xl p-4 sm:p-6 ${color}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="p-2 rounded-lg bg-white/50">{icon}</div>
    </div>
  </div>
);

const Alert = ({
  title,
  message,
  type,
}: {
  title: string;
  message: string;
  type: "warning" | "info";
}) => (
  <div
    className={`p-4 rounded-lg ${
      type === "warning" ? "bg-amber-50" : "bg-sky-50"
    }`}
  >
    <h3 className="font-medium text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-600">{message}</p>
  </div>
);

const ReservationCard = ({
  reservation,
  aircraft,
  pilot,
  onClick,
}: {
  reservation: Reservation;
  aircraft: string;
  pilot: string;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
  >
    <div>
      <p className="font-medium text-slate-900">{aircraft}</p>
      <p className="text-sm text-slate-600">
        {new Date(reservation.startTime).toLocaleString()} -{" "}
        {new Date(reservation.endTime).toLocaleTimeString()}
      </p>
    </div>
    <div className="text-right">
      <p className="font-medium text-slate-900">{pilot}</p>
      <p className="text-sm text-slate-600">
        {reservation.withInstructor ? "Formation" : "Vol local"}
      </p>
    </div>
  </div>
);

const Dashboard = () => {
  console.log("Dashboard mounting...");
  const { user } = useAuth();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  const loadData = async () => {
    try {
      const [
        aircraftData,
        usersData,
        reservationsData,
        flightsData,
        { data: announcementsData, error: announcementsError },
      ] = await Promise.all([
        getAircraft(),
        getUsers(),
        getReservations(),
        getFlights(),
        supabase
          .from("announcements")
          .select(
            `
            *,
            dismissed:dismissed_announcements(
              user_id
            )
          `
          )
          .eq("dismissed.user_id", user?.id)
          .is("dismissed.user_id", null)
          .order("created_at", { ascending: false }),
      ]);

      setAircraft(aircraftData);
      setUsers(usersData);
      setReservations(reservationsData);
      setFlights(flightsData);

      if (announcementsData && !announcementsError) {
        setAnnouncements(announcementsData);
      } else {
        console.error(
          "Erreur lors du chargement des annonces:",
          announcementsError
        );
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Dashboard useEffect running...");
    loadData();
  }, []);

  const handleResetData = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible."
      )
    ) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc("reset_database");

      if (error) throw error;

      toast.success("Données réinitialisées avec succès");
      loadData();
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Erreur lors de la réinitialisation des données");
    }
  };

  const handleDismissAnnouncement = async (id: string) => {
    setDismissedAnnouncements((prev) => [...prev, id]);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeAircraft = aircraft.filter(
    (a) => a.status === "AVAILABLE"
  ).length;
  const totalAircraft = aircraft.length;
  const activePilots = users.filter((u) => u.role === "PILOT").length;
  const todayFlights = reservations.filter(
    (r) => new Date(r.startTime).toDateString() === new Date().toDateString()
  ).length;

  const maintenanceAlerts = aircraft.filter(
    (a) => a.hoursBeforeMaintenance <= 10
  );
  const shouldShowMaintenanceAlerts =
    user?.role === "ADMIN" || user?.role === "MECHANIC";

  const filteredReservations = reservations.filter((r) => {
    if (user?.role === "ADMIN" || user?.role === "INSTRUCTOR") return true;
    return r.userId === user?.id;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <header className="mb-6 sm:mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Tableau de bord
          </h1>
          <p className="text-slate-600">Aperçu de l'activité du club</p>
        </div>

        {user?.role === "ADMIN" && (
          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Réinitialiser les données</span>
          </button>
        )}
      </header>

      {Array.isArray(announcements) &&
        announcements
          .filter((a) => !dismissedAnnouncements.includes(a.id))
          .map((announcement) => (
            <div key={announcement.id} className="mb-4">
              <AnnouncementBanner
                announcement={announcement}
                onDismiss={handleDismissAnnouncement}
              />
            </div>
          ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard
          icon={<Plane className="h-6 w-6 text-sky-600" />}
          title="Appareils actifs"
          value={`${activeAircraft}/${totalAircraft}`}
          description="Appareils disponibles"
          color="bg-sky-50"
        />
        {user?.role !== "MECHANIC" && (
          <StatCard
            icon={<Users className="h-6 w-6 text-emerald-600" />}
            title="Pilotes actifs"
            value={activePilots.toString()}
            description="Membres ce mois"
            color="bg-emerald-50"
          />
        )}
        {user?.role !== "MECHANIC" && (
          <StatCard
            icon={<Calendar className="h-6 w-6 text-indigo-600" />}
            title="Vols aujourd'hui"
            value={todayFlights.toString()}
            description="Vols programmés"
            color="bg-indigo-50"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {shouldShowMaintenanceAlerts && (
          <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertes & Notifications
            </h2>
            <div className="space-y-4">
              {maintenanceAlerts.map((a) => (
                <Alert
                  key={a.id}
                  title="Maintenance à prévoir"
                  message={`${a.registration} nécessite une maintenance dans ${a.hoursBeforeMaintenance} heures de vol`}
                  type="warning"
                />
              ))}
            </div>
          </section>
        )}

        {user?.role !== "MECHANIC" && (
          <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-sky-500" />
              Prochaines réservations
            </h2>
            <div className="space-y-4">
              {filteredReservations
                .filter((r) => new Date(r.startTime) > new Date())
                .sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime()
                )
                .slice(0, 3)
                .map((reservation) => {
                  const aircraftInfo = aircraft.find(
                    (a) => a.id === reservation.aircraftId
                  );
                  const userInfo = users.find(
                    (u) => u.id === reservation.userId
                  );
                  if (!aircraftInfo || !userInfo) return null;

                  return (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      aircraft={aircraftInfo.registration}
                      pilot={`${userInfo.firstName} ${userInfo.lastName}`}
                      onClick={() => setSelectedReservation(reservation)}
                    />
                  );
                })}
            </div>
          </section>
        )}
      </div>

      {selectedReservation && (
        <EditReservationModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onUpdate={loadData}
          reservations={reservations}
        />
      )}
    </div>
  );
};

export default Dashboard;
