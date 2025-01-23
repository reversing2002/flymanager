import React, { useState, useEffect } from 'react';
import { Plus, Calendar, List } from 'lucide-react';
import type { Aircraft, User, Reservation, Availability } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import ReservationModal from './ReservationModal';
import ReservationCard from './ReservationCard';
import { getAircraft, getReservations, getUsers, getAvailabilitiesForPeriod } from '../../lib/queries';
import { hasAnyGroup } from "../../lib/permissions";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';

const ReservationList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const memberId = params.get('member');
    if (memberId) {
      setSelectedMemberId(memberId);
      setViewMode('week'); // Force le mode liste quand un membre est sélectionné
    }
  }, [location.search]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [selectedMemberId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

      const [reservationsData, aircraftData, usersData, availabilitiesData] = await Promise.all([
        getReservations(),
        getAircraft(),
        getUsers(),
        getAvailabilitiesForPeriod(
          startOfMonth.toISOString(),
          endOfMonth.toISOString()
        ),
      ]);

      setReservations(reservationsData);
      setAircraft(aircraftData);
      setUsers(usersData);
      setAvailabilities(availabilitiesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Filter reservations based on filters and search
  useEffect(() => {
    if (!reservations) return;

    let filtered = [...reservations];

    // Si un membre spécifique est sélectionné, on montre toutes ses réservations
    if (selectedMemberId) {
      filtered = filtered.filter(r => 
        r.userId === selectedMemberId || // Membre en tant que pilote
        r.instructorId === selectedMemberId // Membre en tant qu'instructeur
      );
    } 
    // Sinon, on applique les filtres normaux basés sur le rôle
    else if (!hasAnyGroup(currentUser, ['ADMIN'])) {
      filtered = filtered.filter(r => 
        r.userId === currentUser?.id || // User is pilot
        r.instructorId === currentUser?.id // User is instructor
      );
    }

    // Filter to show only future reservations
    const now = new Date();
    filtered = filtered.filter(r => {
      const startTime = new Date(r.startTime);
      return startTime >= now;
    });

    setFilteredReservations(filtered);
  }, [reservations, selectedMemberId, currentUser]);

  // Group reservations by date
  const groupReservationsByDate = (reservations: Reservation[]) => {
    const groups = new Map<string, Reservation[]>();
    
    let datesRange: Date[];
    if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate, { locale: fr });
      const weekEnd = endOfWeek(selectedDate, { locale: fr });
      datesRange = eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      datesRange = [selectedDate];
    }

    // Initialize groups for all dates in range
    datesRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      groups.set(dateKey, []);
    });

    // Group reservations
    reservations.forEach(reservation => {
      const startTime = new Date(reservation.startTime);
      const dateKey = format(startTime, 'yyyy-MM-dd');
      
      if (viewMode === 'week') {
        const weekStart = startOfWeek(selectedDate, { locale: fr });
        const weekEnd = endOfWeek(selectedDate, { locale: fr });
        
        if (isWithinInterval(startTime, { start: weekStart, end: weekEnd })) {
          const existingGroup = groups.get(dateKey) || [];
          groups.set(dateKey, [...existingGroup, reservation]);
        }
      } else {
        if (format(startTime, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) {
          const existingGroup = groups.get(dateKey) || [];
          groups.set(dateKey, [...existingGroup, reservation]);
        }
      }
    });

    return groups;
  };

  // Navigation functions
  const navigatePrevious = () => {
    if (viewMode === 'week') {
      setSelectedDate(prev => {
        const prevWeekStart = startOfWeek(prev, { locale: fr });
        return new Date(prevWeekStart.setDate(prevWeekStart.getDate() - 7));
      });
    } else {
      setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 1)));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setSelectedDate(prev => {
        const nextWeekStart = startOfWeek(prev, { locale: fr });
        return new Date(nextWeekStart.setDate(nextWeekStart.getDate() + 7));
      });
    } else {
      setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 1)));
    }
  };

  const handleCreateReservation = () => {
    setSelectedReservation(null);
    setShowReservationModal(true);
  };

  const handleEditReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowReservationModal(true);
  };

  const handleCreateFlight = (reservation: Reservation) => {
    navigate(`/flights/new?reservationId=${reservation.id}`);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-16">
        <div>
          {selectedMemberId ? (
            <>
              <h1 className="text-2xl font-bold text-slate-900">
                Réservations de {users.find(u => u.id === selectedMemberId)?.name || 'membre'}
              </h1>
              <p className="text-slate-600">Liste des réservations en tant que pilote ou instructeur</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Mes réservations</h1>
              <p className="text-slate-600">Gérez vos réservations de vol</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!selectedMemberId && (
            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm font-medium rounded ${
                  viewMode === 'day'
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded ${
                  viewMode === 'week'
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}

          {(!selectedMemberId || hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR"])) && (
            <div className="hidden sm:block">
              <button
                onClick={handleCreateReservation}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Nouvelle réservation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-4 sticky top-0 z-10">
        <button
          onClick={navigatePrevious}
          className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
        >
          <span className="sr-only">Précédent</span>
          ←
        </button>
        <h2 className="text-lg font-medium text-slate-900 text-center">
          {viewMode === 'week'
            ? `Semaine du ${format(startOfWeek(selectedDate, { locale: fr }), 'dd MMMM', { locale: fr })}`
            : format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
        </h2>
        <button
          onClick={navigateNext}
          className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
        >
          <span className="sr-only">Suivant</span>
          →
        </button>
      </div>

      <div className="space-y-8 pb-24">
        {Array.from(groupReservationsByDate(filteredReservations)).map(([date, dayReservations]) => (
          <div key={date} className="space-y-4">
            <h3 className="font-medium text-slate-900">
              {format(new Date(date), 'EEEE dd MMMM', { locale: fr })}
            </h3>
            {dayReservations.length > 0 ? (
              <div className="space-y-4">
                {dayReservations
                  .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                  .map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      aircraft={aircraft.find((a) => a.id === reservation.aircraftId)}
                      pilot={users.find((u) => u.id === reservation.pilotId)}
                      instructor={users.find((u) => u.id === reservation.instructorId)}
                      onEdit={handleEditReservation}
                      onCreateFlight={handleCreateFlight}
                      canEdit={true}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">Aucune réservation</p>
            )}
          </div>
        ))}
      </div>

      {(!selectedMemberId || hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR"])) && (
        <div className="fixed bottom-4 right-4 sm:hidden z-50">
          <button
            onClick={handleCreateReservation}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-lg transition-all active:scale-95"
            aria-label="Créer une nouvelle réservation"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}

      {showReservationModal && (
        <ReservationModal
          startTime={new Date()}
          endTime={new Date(Date.now() + 2 * 60 * 60 * 1000)} // 2 heures par défaut
          onClose={() => setShowReservationModal(false)}
          onSuccess={() => {
            setShowReservationModal(false);
            loadData();
          }}
          aircraft={aircraft}
          users={users}
          availabilities={availabilities}
          existingReservation={selectedReservation}
          onCreateFlight={handleCreateFlight}
        />
      )}
    </div>
  );
};

export default ReservationList;
