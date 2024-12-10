import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  User as UserIcon,
  CreditCard,
  Clock,
  Calendar,
  Mail,
  Phone,
  ArrowUpRight,
  ArrowDownRight,
  Plane,
} from "lucide-react";
import type { Announcement } from "../../types/database";
import AnnouncementBanner from "../announcements/AnnouncementBanner";
import { getMemberBalance } from "../../lib/queries";

const ProfilePage = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [recentFlights, setRecentFlights] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalFlightHours: 0,
    flightsThisMonth: 0,
  });
  const [balance, setBalance] = useState<{
    validated: number;
    pending: number;
  } | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<
    string[]
  >([]);
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        // Load user details
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (userError) throw userError;
        setUserData(userData);

        // Load announcements
        const { data: announcementsData } = await supabase
          .from("announcements")
          .select(
            `
            *,
            dismissed:dismissed_announcements(
              user_id
            )
          `
          )
          .eq("dismissed.user_id", user.id)
          .is("dismissed.user_id", null)
          .order("created_at", { ascending: false });

        if (announcementsData) {
          setAnnouncements(announcementsData);
        }

        // Load recent transactions
        const { data: transactionsData } = await supabase
          .from("account_entries")
          .select("*")
          .eq("assigned_to_id", user.id)
          .order("date", { ascending: false })
          .limit(5);

        setTransactions(transactionsData || []);

        // Load recent flights
        const { data: flightsData } = await supabase
          .from("flights")
          .select(
            `
            id,
            date,
            duration,
            cost,
            aircraft:aircraft_id(registration)
          `
          )
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(5);

        setRecentFlights(flightsData || []);

        // Load upcoming reservations
        const { data: reservationsData } = await supabase
          .from("reservations")
          .select("*")
          .eq("user_id", user.id)
          .gte("start_time", new Date().toISOString())
          .order("start_time")
          .limit(5);

        setReservations(reservationsData || []);

        // Calculate flight stats
        const totalHours =
          (flightsData || []).reduce(
            (acc, flight) => acc + flight.duration,
            0
          ) / 60;

        const thisMonth = new Date().getMonth();
        const flightsThisMonth = (flightsData || []).filter(
          (f) => new Date(f.date).getMonth() === thisMonth
        ).length;

        setStats({
          totalFlightHours: totalHours,
          flightsThisMonth,
        });

        // Load balance using the centralized getMemberBalance function
        const balanceData = await getMemberBalance(user.id);
        setBalance(balanceData);
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const handleDismissAnnouncement = async (id: string) => {
    setDismissedAnnouncements((prev) => [...prev, id]);
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

  if (error || !userData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl">
          {error || "Une erreur est survenue"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Announcements Section */}
      {announcements
        .filter((a) => !dismissedAnnouncements.includes(a.id))
        .map((announcement) => (
          <div key={announcement.id} className="mb-4">
            <AnnouncementBanner
              announcement={announcement}
              onDismiss={handleDismissAnnouncement}
            />
          </div>
        ))}

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {userData.first_name} {userData.last_name}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              {userData.email && (
                <div className="flex items-center text-slate-600">
                  <Mail className="h-4 w-4 mr-1" />
                  <span className="text-sm">{userData.email}</span>
                </div>
              )}
              {userData.phone && (
                <div className="flex items-center text-slate-600">
                  <Phone className="h-4 w-4 mr-1" />
                  <span className="text-sm">{userData.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Account Balance */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-slate-600" />
              Solde du compte
            </h2>
            {balance && (
              <>
                <div className="text-3xl font-bold text-slate-900">
                  {balance.validated.toFixed(2)} €
                </div>
                {balance.pending !== 0 && (
                  <div className="text-sm text-amber-600 mt-1">
                    {balance.pending.toFixed(2)} € en attente
                  </div>
                )}
              </>
            )}

            {/* Recent Transactions */}
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-slate-600">
                Dernières transactions
              </h3>
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center space-x-2">
                    {transaction.amount >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-slate-600">
                      {transaction.description}
                    </span>
                  </div>
                  <span
                    className={
                      transaction.amount >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  >
                    {transaction.amount >= 0 ? "+" : ""}
                    {transaction.amount.toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Heures de vol
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.totalFlightHours.toFixed(1)}h
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Clock className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Vols ce mois
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.flightsThisMonth}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Prochains vols
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {
                      reservations.filter(
                        (r) => new Date(r.startTime) > new Date()
                      ).length
                    }
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Plane className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Flights */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Derniers vols</h2>
            <div className="space-y-4">
              {recentFlights.map((flight) => (
                <div
                  key={flight.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {flight.aircraft?.registration || "Avion inconnu"}
                    </div>
                    <div className="text-sm text-slate-600">
                      {format(new Date(flight.date), "dd MMMM yyyy", {
                        locale: fr,
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-slate-900">
                      {Math.floor(flight.duration / 60)}h{flight.duration % 60}
                    </div>
                    <div className="text-sm text-slate-600">
                      {flight.cost.toFixed(2)} €
                    </div>
                  </div>
                </div>
              ))}
              {recentFlights.length === 0 && (
                <p className="text-center text-slate-500">Aucun vol récent</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
