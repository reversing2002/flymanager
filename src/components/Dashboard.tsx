import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plane, Users, Calendar, CreditCard, MessageSquare, Sun, Plus } from "lucide-react";
import {
  getAircraft,
  getUsers,
  getReservations,
  getFlights,
  getMemberBalance,
} from "../lib/queries/index";
import {
  hasAnyGroup,
  usePermissions,
  hasPermission
} from "../lib/permissions";
import { PERMISSIONS } from "../types/permissions";

import type {
  Aircraft,
  User,
  Reservation,
  Flight,
  Announcement,
} from "../types/database";
import { useAuth } from "../contexts/AuthContext";
import ReservationModal from "./reservations/ReservationModal";
import AnnouncementBanner from "./announcements/AnnouncementBanner";
import { supabase } from "../lib/supabase";
import AdminDashboard from "./admin/AdminDashboard";
import UpcomingEvents from "./events/UpcomingEvents";
import { Link, useNavigate } from "react-router-dom";
import SunCalc from "suncalc";
import { format } from "date-fns";
import SunTimesDisplay from "./common/SunTimesDisplay";
import AircraftRemarks from "./remarks/AircraftRemarks";
import PendingDiscoveryFlights from "./discovery/PendingDiscoveryFlights";
import DashboardWeatherWidget from "./weather/DashboardWeatherWidget";
import SimpleCreditModal from "./accounts/SimpleCreditModal";
import MiniWindWidget from "./weather/MiniWindWidget";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
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
  <div className={`rounded-xl p-4 sm:p-6 bg-gradient-to-br from-white to-slate-50 shadow-sm border border-slate-100`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="mt-2 text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-white shadow-sm">
        <div className="text-slate-600">{icon}</div>
      </div>
    </div>
  </div>
);

const RecentMessages = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [privateChats, setPrivateChats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'rooms' | 'private'>('rooms');
  const unreadMessagesCount = useUnreadMessages();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || !user?.club?.id) return;

    const fetchRooms = async () => {
      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_messages(
            id,
            content,
            created_at,
            user:user_id (
              id,
              firstName:first_name,
              LastName:last_name
            )
          )
        `)
        .eq('club_id', user.club.id)
        .order('updated_at', { ascending: false });

      if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
        return;
      }

      setRooms(roomsData || []);
    };

    const fetchPrivateChats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_recent_private_conversations', {
          current_user_id: user.id
        });

        if (error) throw error;

        if (data) {
          // Récupérer les détails des utilisateurs pour chaque conversation
          const conversationsWithUsers = await Promise.all(
            data.map(async (conv: any) => {
              const otherId = conv.sender_id === user.id ? conv.recipient_id : conv.sender_id;
              const { data: userData } = await supabase
                .from('users')
                .select('id, first_name, last_name, email, image_url')
                .eq('id', otherId)
                .single();

              return {
                ...conv,
                participant: userData
              };
            })
          );

          setPrivateChats(conversationsWithUsers);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };

    fetchRooms();
    fetchPrivateChats();

    // Souscription aux changements
    const roomsChannel = supabase
      .channel('rooms_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => fetchRooms()
      )
      .subscribe();

    const privateChannel = supabase
      .channel('private_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'private_messages',
          filter: `or(sender_id=eq.${user.id},recipient_id=eq.${user.id})`
        },
        () => fetchPrivateChats()
      )
      .subscribe();

    return () => {
      roomsChannel.unsubscribe();
      privateChannel.unsubscribe();
    };
  }, [user?.id, user?.club?.id]);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Messages</h2>
          {unreadMessagesCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
            </span>
          )}
        </div>
        <Link
          to="/chat"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1"
        >
          <span>Voir tout</span>
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex border-b border-slate-200 mb-4">
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === 'rooms'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('rooms')}
        >
          Salons
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === 'private'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('private')}
        >
          Messages privés
        </button>
      </div>
      
      <div className="space-y-4">
        {activeTab === 'rooms' ? (
          rooms.slice(0, 3).map((room) => {
            const lastMessage = room.chat_messages?.[0];
            return (
              <Link
                key={room.id}
                to={`/chat/`}
                className="block p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-slate-900">{room.name}</h3>
                    {lastMessage && (
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">
                          {lastMessage.user?.firstName} {lastMessage.user?.LastName}:
                        </span>{" "}
                        {lastMessage.content}
                      </p>
                    )}
                  </div>
                  {lastMessage && (
                    <span className="text-xs text-slate-500">
                      {format(new Date(lastMessage.created_at), "HH:mm")}
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          privateChats.slice(0, 3).map((chat) => (
            <Link
              key={`${chat.sender_id}-${chat.recipient_id}`}
              to={`/chat/`}
              className="block p-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-slate-900">
                    {chat.participant.first_name} {chat.participant.last_name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">
                      {chat.sender_id === user?.id ? 'Vous' : chat.participant.first_name}:
                    </span>{" "}
                    {chat.content}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {format(new Date(chat.created_at), "HH:mm")}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Rediriger les administrateurs vers le dashboard admin
  if (hasAnyGroup(user, ['ADMIN'])) {
    return <AdminDashboard />;
  }

  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [sunTimes, setSunTimes] = useState<{
    sunrise: Date;
    sunset: Date;
    aeroStart: Date;
    aeroEnd: Date;
  } | null>(null);

  // Charger les utilisateurs
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  // Stats des membres
  const { data: memberStats } = useQuery({
    queryKey: ['memberStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_member_stats');
      if (error) throw error;
      return data;
    },
  });

  // Stats de la flotte
  const { data: fleetStats } = useQuery({
    queryKey: ['fleetStats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_maintenance_stats');
      if (error) throw error;
      return data;
    },
  });

  // Stats des réservations
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations'],
    queryFn: getReservations,
  });

  const { data: balance } = useQuery({
    queryKey: ['memberBalance', user?.id],
    queryFn: () => getMemberBalance(user?.id || ''),
    enabled: !!user?.id,
  });

  useEffect(() => {
    loadAnnouncementsAndSunTimes();
  }, [user?.id]);

  const loadAnnouncementsAndSunTimes = async () => {
    if (!user?.id) return;

    try {
      // Load announcements and filter out dismissed ones
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select(`
          *,
          dismissed_announcements!left(id)
        `)
        .eq('club_id', user.club?.id)
        .is('dismissed_announcements.id', null)
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;
      setAnnouncements(announcementsData || []);

      // Load club coordinates and calculate sun times
      const { data: clubData } = await supabase
        .from('clubs')
        .select('latitude, longitude')
        .eq('id', user.club?.id)
        .single();

      if (clubData?.latitude && clubData?.longitude) {
        const times = SunCalc.getTimes(new Date(), clubData.latitude, clubData.longitude);
        const aeroStart = new Date(times.sunrise);
        const aeroEnd = new Date(times.sunset);
        
        // La journée aéronautique commence 30 minutes avant le lever du soleil
        aeroStart.setMinutes(aeroStart.getMinutes() - 30);
        // Et se termine 30 minutes après le coucher du soleil
        aeroEnd.setMinutes(aeroEnd.getMinutes() + 30);

        setSunTimes({
          sunrise: times.sunrise,
          sunset: times.sunset,
          aeroStart,
          aeroEnd
        });
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleDismissAnnouncement = async (announcementId: string) => {
    if (!user?.id) return;

    try {
      const { error: dismissError } = await supabase
        .from('dismissed_announcements')
        .upsert([
          {
            user_id: user.id,
            announcement_id: announcementId,
            dismissed_at: new Date().toISOString()
          }
        ], {
          onConflict: 'user_id,announcement_id'
        });

      if (dismissError) throw dismissError;
      
      // Update local state to remove the dismissed announcement
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      toast.success('Annonce masquée');
    } catch (error) {
      console.error('Error dismissing announcement:', error);
      toast.error('Erreur lors du masquage de l\'annonce');
    }
  };

  // Calculate stats
  const activeAircraft = fleetStats?.aircraft_stats?.filter(a => a.status === 'AVAILABLE').length || 0;
  const totalAircraft = fleetStats?.aircraft_stats?.length || 0;
  const activePilots = memberStats?.active_members || 0;
  const todayFlights = reservations.filter(
    (r) => new Date(r.startTime).toDateString() === new Date().toDateString()
  ).length;

  // Filter future reservations
  const now = new Date();
  const futureReservations = reservations
    .filter(r => {
      // Filter for future reservations
      const startTime = new Date(r.startTime);
      if (startTime <= now) return false;

      // Filter for valid aircraft
      const aircraftExists = fleetStats?.aircraft_stats?.some(a => a.id === r.aircraftId);
      if (!aircraftExists) return false;

      // Filter for reservations relevant to the current user
      const isUserPilot = r.pilotId === user?.id;
      const isUserInstructor = r.instructorId === user?.id;
      
      return isUserPilot || isUserInstructor;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Take only the next 5 reservations
  const nextReservations = futureReservations.slice(0, 5);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
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

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Heures de lever/coucher du soleil */}
      <SunTimesDisplay sunTimes={sunTimes} pilotName={user?.first_name} />

      {/* Annonces */}
      {announcements.map((announcement) => (
        <AnnouncementBanner key={announcement.id} announcement={announcement} onDismiss={handleDismissAnnouncement} />
      ))}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Plane className="h-6 w-6" />}
          title="Avions"
          value={`${activeAircraft}`}
          description="Flotte disponible"
          color="blue"
        />
        <StatCard
          icon={<Users className="h-6 w-6" />}
          title="Membres"
          value={activePilots.toString()}
          description="Membres actifs"
          color="green"
        />
        <StatCard
          icon={<Calendar className="h-6 w-6" />}
          title="Réservations"
          value={futureReservations.length.toString()}
          description="Réservations en cours"
          color="purple"
        />
        {balance && (
          <div className="relative">
            <StatCard
              icon={
                <button
                  onClick={() => setShowCreditModal(true)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-md transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Créditer</span>
                </button>
              }
              title="Solde"
              value={`${balance.validated.toFixed(2)}€`}
              description={
                balance.pending !== 0
                  ? `${balance.pending.toFixed(2)}€ en attente`
                  : "Solde validé"
              }
              color="yellow"
            />
          </div>
        )}
      </div>

      {/* Section Météo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Widget météo principal - occupe 6 colonnes sur 12 */}
        <div className="md:col-span-6">
          <DashboardWeatherWidget />
        </div>
        
        {/* Widgets compacts - occupent 3 colonnes chacun */}
        <div className="md:col-span-3">
          <div className="h-full flex flex-col justify-between">
            <MiniWindWidget />
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="h-full flex flex-col justify-between">
            <SunTimesDisplay />
          </div>
        </div>
      </div>

      {/* Prochaines réservations */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Mes prochaines réservations</h2>
        <div className="space-y-4">
          {nextReservations.map((reservation) => {
            const aircraftItem = fleetStats?.aircraft_stats.find(
              (a) => a.id === reservation.aircraftId
            );
            return (
              <div
                key={reservation.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {aircraftItem?.registration || "Avion inconnu"}
                  </div>
                  <div className="text-sm text-slate-600">
                    {new Date(reservation.startTime).toLocaleDateString()}
                    {reservation.instructorId && reservation.instructorId === user?.id && (
                      <div className="text-sm text-sky-600">
                        Élève: {users?.find(u => u.id === reservation.pilotId)?.first_name} {users?.find(u => u.id === reservation.pilotId)?.last_name}
                      </div>
                    )}
                    {reservation.comments && (
                      <div className="text-sm text-gray-500 mt-1">
                        📝 {reservation.comments}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm">
                  {new Date(reservation.startTime).toLocaleTimeString()} -{" "}
                  {new Date(reservation.endTime).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
          {nextReservations.length === 0 && (
            <p className="text-center text-slate-500">
              Aucune réservation à venir
            </p>
          )}
        </div>
      </div>

      {/* Messages et Événements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Messages récents */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Messages récents</h2>
          </div>
          <div className="h-[320px] overflow-y-auto">
            <RecentMessages />
          </div>
        </div>

        {/* Événements à venir */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Événements à venir</h2>
          </div>
          <div className="h-[320px] overflow-y-auto">
            <UpcomingEvents maxEvents={5} />
          </div>
        </div>
      </div>

      {/* Grille 2 colonnes pour les vols découverte et remarques avions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vols découverte */}
        {hasPermission(user, PERMISSIONS.DISCOVERY_FLIGHT_VIEW) && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Vols découverte en attente</h2>
              <Link 
                to="/discovery-flights"
                className="text-sm text-sky-600 hover:text-sky-700"
              >
                Voir tout
              </Link>
            </div>
            <div className="h-[400px] overflow-y-auto">
              <PendingDiscoveryFlights />
            </div>
          </div>
        )}

        {/* Remarques avions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Remarques avions</h2>
            <Link 
              to="/aircraft"
              className="text-sm text-sky-600 hover:text-sky-700"
            >
              Voir tout
            </Link>
          </div>
          <div className="h-[320px] overflow-y-auto">
            <AircraftRemarks limit={5} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedReservation && (
        <ReservationModal
          startTime={new Date(selectedReservation.startTime)}
          endTime={new Date(selectedReservation.endTime)}
          onClose={() => setSelectedReservation(null)}
          onSuccess={() => {
            setSelectedReservation(null);
            loadAnnouncementsAndSunTimes();
          }}
          aircraft={fleetStats?.aircraft_stats}
          users={memberStats?.users}
          existingReservation={selectedReservation}
        />
      )}
      {/* Modal de crédit */}
      {showCreditModal && user && (
        <SimpleCreditModal
          userId={user.id}
          onClose={() => setShowCreditModal(false)}
          onSuccess={() => {
            setShowCreditModal(false);
            // Rafraîchir le solde
            queryClient.invalidateQueries(['memberBalance']);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;