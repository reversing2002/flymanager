import { useState, useEffect } from "react";
import { Plane, Users, Calendar, CreditCard, MessageSquare, Sun } from "lucide-react";
import {
  getAircraft,
  getUsers,
  getReservations,
  getFlights,
  getMemberBalance,
} from "../lib/queries/index";

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
import UpcomingEvents from "./events/UpcomingEvents";
import { hasAnyGroup } from "../lib/permissions";
import { Link } from "react-router-dom";
import SunCalc from "suncalc";
import { format } from "date-fns";
import SunTimesDisplay from "./common/SunTimesDisplay";

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
                participant: userData,
                last_message: [{
                  content: conv.content,
                  created_at: conv.created_at,
                  sender: conv.sender_id === user.id ? {
                    id: user.id,
                    first_name: 'Vous'
                  } : userData
                }]
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

    // Souscription aux changements des messages
    const messagesChannel = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    const privateMessagesChannel = supabase
      .channel('private_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_messages',
          filter: `or(sender_id=eq.${user.id},recipient_id=eq.${user.id})`
        },
        () => {
          fetchPrivateChats();
        }
      )
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
      privateMessagesChannel.unsubscribe();
    };
  }, [user?.id, user?.club?.id]);

  const formatDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="border-b border-slate-200">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
          <Link to="/chat" className="text-sm text-blue-600 hover:text-blue-700">
            Voir tout
          </Link>
        </div>
        <div className="flex border-b border-slate-200">
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'rooms'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('rooms')}
          >
            Salons
          </button>
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === 'private'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('private')}
          >
            Messages privés
          </button>
        </div>
      </div>
      <div className="divide-y divide-slate-200">
        {activeTab === 'rooms' ? (
          rooms.length > 0 ? (
            rooms.map((room) => {
              const lastMessage = room.chat_messages?.[0];
              return (
                <Link
                  key={room.id}
                  to={`/chat?room=${room.id}`}
                  className="block p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {room.name}
                      </p>
                      {lastMessage && (
                        <p className="text-sm text-slate-500 truncate">
                          <span className="font-medium">
                            {lastMessage.user.firstName}:
                          </span>{' '}
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                    {lastMessage && (
                      <div className="flex-shrink-0 text-xs text-slate-400">
                        {formatDate(lastMessage.created_at)}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              Aucun salon disponible
            </div>
          )
        ) : (
          privateChats.length > 0 ? (
            privateChats.map((chat) => {
              const lastMessage = chat.last_message?.[0];
              return (
                <Link
                  key={chat.id || `${chat.sender_id}-${chat.recipient_id}`}
                  to={`/chat?private=${chat.participant.id}`}
                  className="block p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {chat.participant.first_name} {chat.participant.last_name}
                      </p>
                      {lastMessage && (
                        <p className="text-sm text-slate-500 truncate">
                          <span className="font-medium">
                            {lastMessage.sender.id === user?.id ? 'Vous' : lastMessage.sender.first_name}:
                          </span>{' '}
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                    {lastMessage && (
                      <div className="flex-shrink-0 text-xs text-slate-400">
                        {formatDate(lastMessage.created_at)}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              Aucune conversation privée
            </div>
          )
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [balance, setBalance] = useState<{
    validated: number;
    pending: number;
  } | null>(null);
  const [sunTimes, setSunTimes] = useState<{
    sunrise: Date;
    sunset: Date;
    aeroStart: Date;
    aeroEnd: Date;
  } | null>(null);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [aircraftData, usersData, reservationsData, flightsData] = await Promise.all([
        getAircraft(),
        getUsers(),
        getReservations(),
        getFlights(),
      ]);

      setAircraft(aircraftData);
      setUsers(usersData);
      setReservations(reservationsData);
      setFlights(flightsData);

      // Load announcements
      const { data: announcementsData } = await supabase
        .from("announcements")
        .select(`
          *,
          dismissed:dismissed_announcements(
            user_id
          )
        `)
        .eq("dismissed.user_id", user.id)
        .is("dismissed.user_id", null)
        .order("created_at", { ascending: false });

      setAnnouncements(announcementsData || []);

      // Load balance
      const balanceData = await getMemberBalance(user.id);
      setBalance(balanceData);

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

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleDismissAnnouncement = async (id: string) => {
    setDismissedAnnouncements((prev) => [...prev, id]);
  };

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

  const activeAircraft = aircraft.filter((a) => a.status === "AVAILABLE").length;
  const totalAircraft = aircraft.length;
  const activePilots = users.filter((u) => hasAnyGroup({ role: u.role } as User, ["PILOT"])).length;
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
      const aircraftExists = aircraft.some(a => a.id === r.aircraftId);
      if (!aircraftExists) return false;

      // Filter for reservations relevant to the current user
      const isUserPilot = r.pilotId === user?.id;
      const isUserInstructor = r.instructorId === user?.id;
      
      return isUserPilot || isUserInstructor;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Take only the next 5 reservations
  const nextReservations = futureReservations.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Membres actifs"
          value={users?.length.toString() || "0"}
          description="Nombre total de membres"
          color="bg-gradient-to-br from-sky-400 to-sky-600"
        /> */}
        <StatCard
          icon={<Plane className="w-6 h-6" />}
          title="Avions"
          value={aircraft?.length.toString() || "0"}
          description="Flotte disponible"
          color="bg-gradient-to-br from-emerald-400 to-emerald-600"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6" />}
          title="Réservations"
          value={futureReservations.length.toString()}
          description="Réservations à venir"
          color="bg-gradient-to-br from-amber-400 to-amber-600"
        />
        {balance && (
          <StatCard
            icon={<CreditCard className="w-6 h-6" />}
            title="Solde"
            value={`${balance.validated.toFixed(2)}€`}
            description={
              balance.pending !== 0
                ? `${balance.pending.toFixed(2)}€ en attente`
                : "Solde validé"
            }
            color="bg-gradient-to-br from-sky-400 to-sky-600"
          />
        )}
        <StatCard
          icon={<Sun className="w-6 h-6" />}
          title="Horaires du soleil"
          value={sunTimes ? `${format(sunTimes.sunrise, 'HH:mm')} - ${format(sunTimes.sunset, 'HH:mm')}` : "--:-- - --:--"}
          description={sunTimes ? `Journée aéro: ${format(sunTimes.aeroStart, 'HH:mm')} - ${format(sunTimes.aeroEnd, 'HH:mm')}` : "Chargement..."}
          color="bg-gradient-to-br from-emerald-400 to-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Messages récents</h2>
            <Link to="/messages" className="text-sm text-slate-600 hover:text-slate-800">
              Voir tout
            </Link>
          </div>
          <RecentMessages />
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Événements à venir</h2>
            <Link to="/events" className="text-sm text-slate-600 hover:text-slate-800">
              Voir tout
            </Link>
          </div>
          <UpcomingEvents />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prochaines réservations */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">Mes prochaines réservations</h2>
          <div className="space-y-4">
            {nextReservations.map((reservation) => {
              const aircraftItem = aircraft.find(
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