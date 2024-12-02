import React, { useState, useEffect } from 'react';
import { Filter, Plus, Search } from 'lucide-react';
import type { Aircraft, User, Reservation } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import ReservationModal from './ReservationModal';
import ReservationCard from './ReservationCard';
import FilterPanel from './FilterPanel';
import { getAircraft, getReservations, getUsers } from '../../lib/queries';
import { hasAnyGroup } from "../../lib/permissions";

const ReservationList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    aircraftTypes: [] as string[],
    instructors: [] as string[],
    status: 'all',
    availability: 'all',
    roleBased: false,
    futureOnly: false,
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reservationsData, aircraftData, usersData] = await Promise.all([
        getReservations(),
        getAircraft(),
        getUsers(),
      ]);

      console.log('Loaded reservations:', reservationsData);
      setReservations(reservationsData);
      setAircraft(aircraftData);
      setUsers(usersData);
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

    // Filter reservations based on user role
    if (!hasAnyGroup(currentUser, ['ADMIN'])) {
      filtered = filtered.filter(r => r.userId === currentUser.id);
    }

    // Filter to show only future reservations
    const now = new Date();
    filtered = filtered.filter(r => {
      const startTime = new Date(r.startTime);
      return startTime >= now;
    });

    // Sort by start time (most recent first)
    filtered.sort((a, b) => {
      const startTimeA = a.startTime;
      const startTimeB = b.startTime;
      
      if (!startTimeA || !startTimeB) {
        return 0;
      }
      
      const dateA = new Date(startTimeA).getTime();
      const dateB = new Date(startTimeB).getTime();
      return dateB - dateA;
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const pilot = users.find(u => u.id === r.userId);
        const instructor = users.find(u => u.id === r.instructorId);
        const aircraftItem = aircraft.find(a => a.id === r.aircraftId);
        
        return (
          pilot?.first_name?.toLowerCase().includes(query) ||
          pilot?.last_name?.toLowerCase().includes(query) ||
          instructor?.first_name?.toLowerCase().includes(query) ||
          instructor?.last_name?.toLowerCase().includes(query) ||
          aircraftItem?.registration.toLowerCase().includes(query)
        );
      });
    }

    // Apply filters
    if (filters.aircraftTypes.length > 0) {
      filtered = filtered.filter(r => {
        const aircraftItem = aircraft.find(a => a.id === r.aircraftId);
        return aircraftItem && filters.aircraftTypes.includes(aircraftItem.type);
      });
    }

    if (filters.instructors.length > 0) {
      filtered = filtered.filter(r => 
        r.instructorId && filters.instructors.includes(r.instructorId)
      );
    }

    if (filters.roleBased) {
      if (hasAnyGroup(currentUser, ['PILOT'])) {
        filtered = filtered.filter(r => r.userId === currentUser.id);
      } else if (hasAnyGroup(currentUser, ['INSTRUCTOR'])) {
        filtered = filtered.filter(r => 
          r.userId === currentUser.id || 
          r.instructorId === currentUser.id
        );
      }
    }

    if (filters.futureOnly) {
      const now = new Date();
      filtered = filtered.filter(r => {
        const startTime = new Date(r.startTime);
        return startTime > now;
      });
    }

    setFilteredReservations(filtered);
  }, [reservations, currentUser, searchQuery, filters, aircraft, users]);

  const handleCreateReservation = () => {
    setSelectedReservation(null);
    setShowReservationModal(true);
  };

  const handleEditReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowReservationModal(true);
  };

  const instructors = users.filter(u => hasAnyGroup({ role: u.role } as User, ['INSTRUCTOR']));

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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes réservations</h1>
          <p className="text-slate-600">Gérez vos réservations de vol</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filtres</span>
          </button>
          <button
            onClick={handleCreateReservation}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle réservation</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher une réservation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-sky-500"
        />
      </div>

      {showFilters && (
        <FilterPanel
          onClose={() => setShowFilters(false)}
          onFiltersChange={setFilters}
          aircraft={aircraft}
          instructors={instructors}
          filters={filters}
        />
      )}

      <div className="space-y-4">
        {filteredReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            aircraft={aircraft.find(a => a.id === reservation.aircraftId)}
            pilot={users.find(u => u.id === reservation.userId)}
            instructor={users.find(u => u.id === reservation.instructorId)}
            onEdit={handleEditReservation}
            canEdit={
              hasAnyGroup(currentUser, ['ADMIN']) ||
              currentUser?.id === reservation.userId ||
              currentUser?.id === reservation.instructorId
            }
          />
        ))}

        {filteredReservations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-600">Aucune réservation trouvée</p>
          </div>
        )}
      </div>

      {showReservationModal && (
        <ReservationModal
          startTime={selectedReservation ? new Date(selectedReservation.startTime) : new Date()}
          endTime={selectedReservation ? new Date(selectedReservation.endTime) : new Date()}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedReservation(null);
          }}
          onSuccess={() => {
            setShowReservationModal(false);
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

export default ReservationList;