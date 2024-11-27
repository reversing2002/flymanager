import React, { useState, useEffect } from "react";
import { Plane, Users, Calendar, CreditCard } from "lucide-react";
import {
  getAircraft,
  getUsers,
  getReservations,
  getFlights,
  getMemberBalance,
  getDailyChallenge,
} from "../lib/queries/index";

import type {
  Aircraft,
  User,
  Reservation,
  Flight,
  Announcement,
  ClubEvent,
} from "../types/database";
import { useAuth } from "../contexts/AuthContext";
import ReservationModal from "./reservations/ReservationModal";
import AnnouncementBanner from "./announcements/AnnouncementBanner";
import { supabase } from "../lib/supabase";
import type { DailyChallenge } from "../types/training";

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

const Dashboard = () => {
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
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [balance, setBalance] = useState<{
    validated: number;
    pending: number;
  } | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(
    null
  );

  const loadData = async () => {
    try {
      const [
        aircraftData,
        usersData,
        reservationsData,
        flightsData,
        { data: announcementsData },
        { data: eventsData },
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
        supabase
          .from("club_events")
          .select("*")
          .gte("start_time", new Date().toISOString())
          .order("start_time")
          .limit(3),
      ]);

      setAircraft(aircraftData);
      setUsers(usersData);
      setReservations(reservationsData);
      setFlights(flightsData);
      setAnnouncements(announcementsData || []);
      setEvents(eventsData || []);

      // Load user balance if available
      if (user?.id) {
        const balanceData = await getMemberBalance(user.id);
        setBalance(balanceData);
      }

      // Load daily challenge
      if (user?.id) {
        const challengeData = await getDailyChallenge(user.id);
        setDailyChallenge(challengeData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Tableau de bord
        </h1>
        <p className="text-slate-600">Aperçu de l'activité du club</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <StatCard
          icon={<Plane className="h-6 w-6 text-sky-600" />}
          title="Appareils actifs"
          value={`${activeAircraft}/${totalAircraft}`}
          description="Appareils disponibles"
          color="bg-sky-50"
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-emerald-600" />}
          title="Pilotes actifs"
          value={activePilots.toString()}
          description="Membres ce mois"
          color="bg-emerald-50"
        />
        <StatCard
          icon={<Calendar className="h-6 w-6 text-indigo-600" />}
          title="Vols aujourd'hui"
          value={todayFlights.toString()}
          description="Vols programmés"
          color="bg-indigo-50"
        />
        {balance && (
          <StatCard
            icon={<CreditCard className="h-6 w-6 text-purple-600" />}
            title="Solde du compte"
            value={`${balance.validated.toFixed(2)} €`}
            description={
              balance.pending !== 0
                ? `${balance.pending.toFixed(2)} € en attente`
                : "Solde validé"
            }
            color="bg-purple-50"
          />
        )}
      </div>

      {selectedReservation && (
        <ReservationModal
          startTime={new Date(selectedReservation.startTime)}
          endTime={new Date(selectedReservation.endTime)}
          onClose={() => setSelectedReservation(null)}
          onSuccess={() => {
            setSelectedReservation(null);
            loadData();
          }}
          aircraft={aircraft}
          users={users}
          existingReservation={selectedReservation}
        />
      )}
    </div>
  );
};

export default Dashboard;
