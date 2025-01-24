import { useState, useEffect, useMemo } from "react";
import { Filter, Plus, X, Trash2, Check, Edit, CheckCircle2, GraduationCap, Download, Timer } from "lucide-react";
import { getFlights, getAircraft, getUsers, validateFlight, deleteFlight } from "../../lib/queries";
import type { Aircraft, User, Flight } from "../../types/database";
import { useAuth } from "../../contexts/AuthContext";
import NewFlightForm from "./NewFlightForm";
import EditFlightForm from "./EditFlightForm";
import FlightFilters from "./FlightFilters";
import FlightTotals from "./FlightTotals";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { hasAnyGroup } from "../../lib/permissions";
import CompetenciesModal from "../progression/CompetenciesModal";
import { useNavigate, useLocation } from "react-router-dom";

// Fonction utilitaire pour vérifier la cohérence des horamètres
const checkHourMeterConsistency = (currentFlight: Flight, flights: Flight[]): { isConsistent: boolean; previousFlight: Flight | null } => {
  if (!currentFlight.start_hour_meter || !currentFlight.end_hour_meter) {
    return { isConsistent: true, previousFlight: null }; // Si pas d'horamètres, on considère que c'est cohérent
  }

  // Trouver le vol précédent pour le même avion
  const previousFlights = flights
    .filter(f => 
      f.aircraftId === currentFlight.aircraftId && // Même avion
      (
        new Date(f.date).getTime() < new Date(currentFlight.date).getTime() || // Date antérieure
        (
          new Date(f.date).getTime() === new Date(currentFlight.date).getTime() && // Même date
          (f.start_hour_meter || 0) < (currentFlight.start_hour_meter || 0) // Horamètre inférieur
        )
      )
    )
    .sort((a, b) => {
      // Trier par date décroissante
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Si même date, trier par horamètre décroissant
      const aStart = a.start_hour_meter || 0;
      const bStart = b.start_hour_meter || 0;
      return bStart - aStart;
    });

  const previousFlight = previousFlights[0];

  // Vérifier la cohérence avec le vol précédent
  if (previousFlight && previousFlight.end_hour_meter) {
    return {
      isConsistent: currentFlight.start_hour_meter === previousFlight.end_hour_meter,
      previousFlight
    };
  }

  // Si pas de vol précédent ou pas d'horamètre de fin, on considère que c'est cohérent
  return { isConsistent: true, previousFlight: null };
};

const FlightList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewFlightForm, setShowNewFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [flightTypes, setFlightTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompetenciesModal, setShowCompetenciesModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [personalFlights, setPersonalFlights] = useState<Flight[]>([]);
  const [studentFlights, setStudentFlights] = useState<Flight[]>([]);
  const [instructorStudents, setInstructorStudents] = useState<User[]>([]);
  const [filters, setFilters] = useState({
    dateRange: "all",
    startDate: "",
    endDate: "",
    aircraftTypes: [],
    aircraftIds: [],
    flightTypes: [],
    validated: "all",
    accountingCategories: [],
    memberId: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFlights, setTotalFlights] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [inconsistentFlights, setInconsistentFlights] = useState<Set<string>>(new Set());

  // Fonction pour vérifier si des filtres sont actifs
  const hasActiveFilters = () => {
    return filters.dateRange !== "all" ||
      filters.startDate !== "" ||
      filters.endDate !== "" ||
      filters.aircraftTypes.length > 0 ||
      filters.aircraftIds.length > 0 ||
      filters.flightTypes.length > 0 ||
      filters.validated !== "all" ||
      filters.accountingCategories.length > 0 ||
      filters.memberId !== null;
  };

  // Mettre à jour la taille de page quand les filtres changent
  useEffect(() => {
    setPageSize(hasActiveFilters() ? 5000 : 25);
  }, [filters]);

  const getInstructorStudents = (flights: Flight[]) => {
    if (!user || !hasAnyGroup(user, ["INSTRUCTOR"])) {
      console.log("Not an instructor or no user", { user });
      return [];
    }
    
    console.log("Getting instructor students", {
      instructorId: user.id,
      totalFlights: flights.length,
      instructorFlights: flights.filter(flight => flight.instructorId === user.id).length
    });
    
    // Récupérer tous les élèves uniques qui ont fait des vols avec cet instructeur
    const studentIds = [...new Set(flights
      .filter(flight => {
        const isInstructorFlight = flight.instructorId === user.id && flight.userId !== user.id;
        console.log("Checking flight", {
          flightId: flight.id,
          instructorId: flight.instructorId,
          userId: flight.userId,
          isInstructorFlight
        });
        return isInstructorFlight;
      })
      .map(flight => flight.userId))];
    
    console.log("Found student IDs", { studentIds });
    
    const students = users.filter(u => studentIds.includes(u.id));
    console.log("Found students", { students });
    
    return students;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Starting loadData with filters:", filters);
      console.log("Current user:", user);

      const isInstructor = hasAnyGroup(user, ["INSTRUCTOR"]);

      // Préparer les filtres en fonction du rôle de l'utilisateur
      const flightFilters = {
        ...filters,
        userId: !hasAnyGroup(user, ["ADMIN"]) ? user?.id : filters.memberId,
        includeStudentFlights: isInstructor
      };

      console.log("Using filters:", flightFilters);

      // Charger toutes les données en parallèle
      const [flightsData, aircraftData, usersData] = await Promise.all([
        getFlights(1, 5000, flightFilters),
        getAircraft(),
        getUsers(),
      ]);

      console.log("Raw flights data:", {
        data: flightsData.data,
        count: flightsData.count
      });

      // D'abord définir les utilisateurs
      setUsers(usersData);

      setAircraftList(aircraftData);

      // Séparer les vols personnels et les vols des élèves pour les instructeurs
      if (isInstructor) {
        const personal = flightsData.data.filter(
          (flight) => flight.userId === user?.id
        );
        const students = flightsData.data.filter(
          (flight) => flight.instructorId === user?.id && flight.userId !== user?.id
        );

        console.log("Flight breakdown:", {
          personal: personal.length,
          students: students.length
        });

        setPersonalFlights(personal);
        setStudentFlights(students);
        
        // Pour les instructeurs, on ne montre que leurs élèves dans la liste déroulante
        const studentsList = usersData.filter(u => 
          students.some(flight => flight.userId === u.id)
        );
        setInstructorStudents(studentsList);
      } else if (hasAnyGroup(user, ["ADMIN"])) {
        setInstructorStudents(usersData);
      }

      // Définir les vols filtrés
      setFlights(flightsData.data);
      setFilteredFlights(flightsData.data);
      setTotalFlights(flightsData.count);

      // Load flight types
      const { data: flightTypesData, error: flightTypesError } = await supabase
        .from("flight_types")
        .select(`
          id,
          name,
          requires_instructor,
          accounting_category_id,
          accounting_category:accounting_categories!accounting_category_id(*)
        `);

      if (flightTypesError) throw flightTypesError;

      const typesMap = {};
      if (flightTypesData) {
        flightTypesData.forEach((type) => {
          typesMap[type.id] = type.name;
        });
      }
      setFlightTypes(typesMap);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Erreur lors du chargement des données");
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const memberId = params.get("member");
    if (memberId) {
      setFilters(prev => ({
        ...prev,
        memberId
      }));
      setShowFilters(true);
    }
  }, [location.search]);

  useEffect(() => {
    loadData();
  }, [filters, user]);

  useEffect(() => {
    // Mettre à jour la liste des vols incohérents
    const newInconsistentFlights = new Set<string>();
    
    filteredFlights.forEach(flight => {
      const { isConsistent, previousFlight } = checkHourMeterConsistency(flight, filteredFlights);
      if (!isConsistent && previousFlight) {
        newInconsistentFlights.add(flight.id);
        newInconsistentFlights.add(previousFlight.id);
      }
    });
    
    setInconsistentFlights(newInconsistentFlights);
  }, [filteredFlights]);

  useEffect(() => {
    // Apply filters
    let filtered = [...flights].sort((a, b) => {
      // D'abord trier par date décroissante
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Si même date, trier par horamètre décroissant
      const aStart = a.start_hour_meter || 0;
      const bStart = b.start_hour_meter || 0;
      return bStart - aStart;
    });

    console.log('Starting filter application:', {
      initialFlights: flights.length,
      filters
    });

    // Pour les admins, on filtre tous les vols liés au membre sélectionné
    if (hasAnyGroup(user, ["ADMIN"]) && filters.memberId) {
      filtered = filtered.filter(flight => 
        flight.userId === filters.memberId || 
        flight.instructorId === filters.memberId
      );
      console.log('After admin member filter:', {
        memberId: filters.memberId,
        flightsCount: filtered.length
      });
    }
    // Pour les instructeurs, on filtre uniquement les vols de leurs élèves
    else if (hasAnyGroup(user, ["INSTRUCTOR"]) && filters.memberId) {
      filtered = studentFlights.filter(flight => flight.userId === filters.memberId);
      console.log('After instructor student filter:', {
        studentId: filters.memberId,
        flightsCount: filtered.length
      });
    }

    // Filter by date range
    if (filters.dateRange !== "all") {
      const before = filtered.length;
      filtered = filtered.filter((flight) => {
        const flightDate = new Date(flight.date);
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;

        if (start && end) {
          return flightDate >= start && flightDate <= end;
        }
        return true;
      });
      console.log('After date filter:', {
        before,
        after: filtered.length,
        dateRange: filters.dateRange,
        startDate: filters.startDate,
        endDate: filters.endDate
      });
    }

    // Filter by aircraft type
    if (filters.aircraftTypes.length > 0) {
      filtered = filtered.filter((flight) => {
        const aircraft = aircraftList.find((a) => a.id === flight.aircraftId);
        return aircraft && filters.aircraftTypes.includes(aircraft.type);
      });
      console.log('After aircraft type filter:', filtered.length);
    }

    // Filter by specific aircraft
    if (filters.aircraftIds.length > 0) {
      filtered = filtered.filter((flight) =>
        filters.aircraftIds.includes(flight.aircraftId)
      );
      console.log('After aircraft ID filter:', filtered.length);
    }

    // Filter by flight type
    if (filters.flightTypes.length > 0) {
      filtered = filtered.filter((flight) =>
        filters.flightTypes.includes(flight.flightTypeId)
      );
      console.log('After flight type filter:', filtered.length);
    }

    // Filter by accounting category
    if (filters.accountingCategories.length > 0) {
      filtered = filtered.filter((flight) =>
        filters.accountingCategories.includes(flight.accountingCategory)
      );
      console.log('After accounting category filter:', filtered.length);
    }

    // Filter by validation status
    if (filters.validated !== "all") {
      filtered = filtered.filter((flight) =>
        filters.validated === "yes" ? flight.validated : !flight.validated
      );
      console.log('After validation filter:', {
        validationStatus: filters.validated,
        filteredCount: filtered.length
      });
    }

    console.log('Final filtered flights:', filtered.length);
    setFilteredFlights(filtered);
  }, [flights, filters, aircraftList, studentFlights, user]);

  const handleNewFlightSuccess = async () => {
    await loadData();
    setShowNewFlightForm(false);
  };

  const handleEditClick = (flight: Flight) => {
    if (!user || (!hasAnyGroup(user, ["ADMIN"]) && flight.validated)) return;
    setEditingFlight(flight);
  };

  const handleEditSuccess = async () => {
    await loadData();
    setEditingFlight(null);
  };

  const handleValidateFlight = async (flight: Flight) => {
    try {
      await validateFlight(flight.id);
      toast.success("Vol validé avec succès");
      await loadData();
    } catch (error) {
      console.error("Error validating flight:", error);
      toast.error("Erreur lors de la validation du vol");
    }
  };

  const handleDeleteFlight = async (flight: Flight) => {
    const confirmDelete = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce vol ? Cette action supprimera également toutes les entrées comptables associées."
    );

    if (confirmDelete) {
      try {
        await deleteFlight(flight.id);
        toast.success("Vol supprimé avec succès");
        loadData();
      } catch (error) {
        console.error("Error deleting flight:", error);
        toast.error("Erreur lors de la suppression du vol");
      }
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  const canEditFlight = (flight: Flight) => {
    // Un pilote peut modifier son vol s'il n'est pas validé
    return !flight.validated && (
      flight.userId === user?.id || // Le pilote du vol
      hasAnyGroup(user, ["ADMIN"]) || // Les administrateurs
      (hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id) // L'instructeur du vol
    );
  };

  const renderActionButtons = (flight: Flight) => {
    return (
      <div className="flex items-center gap-2">
        {canEditFlight(flight) && (
          <button
            onClick={() => setEditingFlight(flight)}
            className="text-blue-600 hover:text-blue-800"
            title="Modifier"
          >
            <Edit size={20} />
          </button>
        )}
        {hasAnyGroup(user, ["ADMIN"]) && !flight.validated && (
          <button
            onClick={() => handleValidateFlight(flight)}
            className="text-green-600 hover:text-green-800"
            title="Valider"
          >
            <Check size={20} />
          </button>
        )}
        {hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id && (
          <button
            onClick={() => {
              setSelectedStudentId(flight.userId);
              setSelectedFlightId(flight.id);
              setShowCompetenciesModal(true);
            }}
            className="text-purple-600 hover:text-purple-800"
            title="Gérer les compétences"
          >
            <GraduationCap size={20} />
          </button>
        )}
        {(hasAnyGroup(user, ["ADMIN"]) || 
          (!flight.validated && (
            flight.userId === user?.id || 
            (hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id)
          ))
        ) && (
          <button
            onClick={() => handleDeleteFlight(flight)}
            className="text-red-600 hover:text-red-800"
            title="Supprimer"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    );
  };

  const personalPaginatedFlights = useMemo(() => {
    let personalFlights = filteredFlights;
    
    // Pour les admins, montrer tous les vols sauf si un membre est sélectionné
    if (hasAnyGroup(user, ["ADMIN"])) {
      if (filters.memberId) {
        personalFlights = filteredFlights.filter(flight => 
          flight.userId === filters.memberId || 
          flight.instructorId === filters.memberId
        );
      }
    } else {
      // Pour les instructeurs et autres utilisateurs, ne montrer que leurs vols personnels
      personalFlights = filteredFlights.filter(flight => flight.userId === user?.id);
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return personalFlights.slice(startIndex, endIndex);
  }, [filteredFlights, currentPage, pageSize, user, filters.memberId]);

  const studentPaginatedFlights = useMemo(() => {
    if (!hasAnyGroup(user, ["INSTRUCTOR"])) return [];
    // Pour les vols d'étudiants, montrer les vols où l'instructeur est instructeur
    const studentFlights = filteredFlights.filter(flight => 
      flight.instructorId === user?.id && flight.userId !== user?.id
    );
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return studentFlights.slice(startIndex, endIndex);
  }, [filteredFlights, currentPage, pageSize, user]);

  const personalFlightTotals = useMemo(() => {
    let personalFlights = filteredFlights;
    
    // Pour les admins, calculer les totaux de tous les vols sauf si un membre est sélectionné
    if (hasAnyGroup(user, ["ADMIN"])) {
      if (filters.memberId) {
        personalFlights = filteredFlights.filter(flight => 
          flight.userId === filters.memberId || 
          flight.instructorId === filters.memberId
        );
      }
    } else {
      // Pour les instructeurs et autres utilisateurs, ne calculer que leurs vols personnels
      personalFlights = filteredFlights.filter(flight => flight.userId === user?.id);
    }

    return {
      totalTime: personalFlights.reduce((acc, flight) => acc + flight.duration, 0),
      totalCost: personalFlights.reduce((acc, flight) => acc + flight.cost + (flight.instructorCost || 0), 0),
    };
  }, [filteredFlights, user, filters.memberId]);

  const studentFlightTotals = useMemo(() => {
    if (!hasAnyGroup(user, ["INSTRUCTOR"])) return { totalTime: 0, totalCost: 0 };
    const studentFlights = filteredFlights.filter(flight => 
      flight.instructorId === user?.id && flight.userId !== user?.id
    );
    return {
      totalTime: studentFlights.reduce((acc, flight) => acc + flight.duration, 0),
      totalCost: studentFlights.reduce((acc, flight) => acc + flight.cost + (flight.instructorCost || 0), 0),
    };
  }, [filteredFlights, user]);

  const renderStudentFlights = () => {
    if (!studentPaginatedFlights.length) return null;
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Vols de vos élèves
        </h2>
        <div className="mb-4 text-slate-600">
          Temps total d'instruction:{" "}
          {formatDuration(
            studentPaginatedFlights.reduce(
              (acc, flight) => acc + flight.duration,
              0
            )
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-4 font-medium text-slate-600 max-w-[120px]">
                  Nom
                </th>
                <th className="text-left p-4 font-medium text-slate-600 w-[100px]">
                  Date du vol
                </th>
                <th className="text-left p-4 font-medium text-slate-600 w-[80px]">
                  Appareil
                </th>
                <th className="text-center p-4 font-medium text-slate-600 w-[40px]">
                  Horamètre
                </th>
                <th className="text-left p-4 font-medium text-slate-600 w-[100px]">
                  Type de vol
                </th>
                <th className="text-left p-4 font-medium text-slate-600 max-w-[120px]">
                  Instructeur
                </th>
                <th className="text-left p-4 font-medium text-slate-600 w-[80px]">
                  Durée
                </th>
                <th className="text-right p-4 font-medium text-slate-600 w-[100px]">
                  Coût total
                </th>
                <th className="text-right p-4 font-medium text-slate-600 w-[100px]">
                  Dont instruction
                </th>
                <th className="text-center p-4 font-medium text-slate-600">
                  Validé
                </th>
                <th className="text-center p-4 font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {studentPaginatedFlights.map((flight) => {
                const aircraft = aircraftList.find(
                  (a) => a.id === flight.aircraftId
                );
                const pilot = users.find((u) => u.id === flight.userId);
                const instructor = users.find(
                  (u) => u.id === flight.instructorId
                );

                console.log('Flight details:', {
                  id: flight.id,
                  date: flight.date,
                  pilot: pilot ? `${pilot.first_name} ${pilot.last_name}` : 'N/A',
                  instructor: instructor ? `${instructor.first_name} ${instructor.last_name}` : 'N/A',
                  cost: flight.cost,
                  instructorCost: flight.instructorCost,
                  instructorId: flight.instructorId,
                  flightType: flight.flightType,
                });

                const { isConsistent, previousFlight } = checkHourMeterConsistency(flight, filteredFlights);

                return (
                  <tr
                    key={flight.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      !isConsistent || inconsistentFlights.has(flight.id) ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="p-4 truncate max-w-[120px]" title={pilot ? `${pilot.first_name} ${pilot.last_name}` : "N/A"}>
                      {pilot && (
                        <button
                          onClick={() => navigate(`/members/${pilot.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {pilot.first_name} {pilot.last_name}
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      {new Date(flight.date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {aircraft?.registration || "N/A"}
                    </td>
                    <td className="p-4 text-center">
                      {flight.start_hour_meter && flight.end_hour_meter && (
                        <div className="flex items-center justify-center gap-2">
                          <Timer 
                            size={20} 
                            className={
                              isConsistent && !inconsistentFlights.has(flight.id)
                              ? "text-green-600"
                              : "text-red-600"
                            }
                            title={`Horamètre départ: ${flight.start_hour_meter}, fin: ${flight.end_hour_meter}${
                              !isConsistent ? " ⚠️ Incohérence avec le vol précédent" : 
                              inconsistentFlights.has(flight.id) ? " ⚠️ Vol lié à une incohérence" : ""
                            }`}
                          />
                          <span className="text-xs text-slate-600">
                            {flight.start_hour_meter} → {flight.end_hour_meter}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {flightTypes[flight.flightTypeId] ||
                        flight.flightTypeId}
                    </td>
                    <td className="p-4 truncate max-w-[120px]" title={instructor ? `${instructor.first_name} ${instructor.last_name}` : "-"}>
                      {instructor && (
                        <button
                          onClick={() => navigate(`/members/${instructor.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {instructor.first_name} {instructor.last_name}
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      {formatDuration(flight.duration)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end">
                        <span className={`${flight.flightType?.accounting_category?.is_club_paid ? 'text-green-600 font-medium' : ''}`}>
                          {flight.flightType?.accounting_category?.is_club_paid 
                            ? '0.00 €' 
                            : `${(flight.cost + (flight.instructorCost || 0)).toFixed(2)} €`}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {flight.instructorCost ? flight.instructorCost.toFixed(2) : "-"}
                    </td>
                    <td className="p-4 text-center">
                      {hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id && (
                        <button
                          onClick={() => {
                            setSelectedStudentId(flight.userId);
                            setSelectedFlightId(flight.id);
                            setShowCompetenciesModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-800"
                          title="Gérer les compétences"
                        >
                          <GraduationCap size={20} />
                        </button>
                      )}
                      {!flight.validated && hasAnyGroup(user, ["ADMIN"]) ? (
                        <button
                          onClick={() => handleValidateFlight(flight)}
                          className="text-green-600 hover:text-green-800"
                          title="Valider"
                        >
                          <Check size={20} />
                        </button>
                      ) : flight.validated ? (
                        <span className="text-green-600" title="Vol validé">
                          <CheckCircle2 size={20} />
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      {(hasAnyGroup(user, ["ADMIN"]) || !flight.validated) && (
                        <>
                          {(hasAnyGroup(user, ["ADMIN"]) || 
                            flight.userId === user?.id || 
                            (hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id)
                          ) && (
                            <button
                              onClick={() => setEditingFlight(flight)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Modifier"
                            >
                              <Edit size={20} />
                            </button>
                          )}
                          {(hasAnyGroup(user, ["ADMIN"]) || 
                            (!flight.validated && (
                              flight.userId === user?.id || 
                              (hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id)
                            ))
                          ) && (
                            <button
                              onClick={() => handleDeleteFlight(flight)}
                              className="text-red-600 hover:text-red-800"
                              title="Supprimer"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleExport = () => {
    // Préparer les données filtrées pour l'export
    const dataToExport = filteredFlights.map((flight) => {
      const aircraft = aircraftList.find((a) => a.id === flight.aircraftId);
      const pilot = users.find((u) => u.id === flight.userId);
      const instructor = flight.instructorId ? users.find((u) => u.id === flight.instructorId) : null;
      
      return {
        "Date": new Date(flight.date).toLocaleDateString('fr-FR'),
        "Pilote": pilot ? `${pilot.last_name} ${pilot.first_name}` : "Inconnu",
        "Instructeur": instructor ? `${instructor.last_name} ${instructor.first_name}` : "-",
        "Aéronef": aircraft ? `${aircraft.registration} (${aircraft.type})` : "Inconnu",
        "Type de vol": flightTypes[flight.flightTypeId] || "Inconnu",
        "Durée": formatDuration(flight.duration),
        "Atterrissages": flight.landings,
        "Horamètre début": flight.start_hour_meter || "-",
        "Horamètre fin": flight.end_hour_meter || "-",
        "Validé": flight.validated ? "Oui" : "Non",
        "Remarques": flight.remarks || "-"
      };
    });

    // Convertir en CSV
    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(";"),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Échapper les guillemets et ajouter des guillemets si nécessaire
          const formattedValue = value?.toString().includes(";") 
            ? `"${value.toString().replace(/"/g, '""')}"` 
            : value;
          return formattedValue;
        }).join(";")
      )
    ].join("\n");

    // Créer et télécharger le fichier
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    link.setAttribute("href", url);
    link.setAttribute("download", `export_vols_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Export réussi !");
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {showNewFlightForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Nouveau vol</h2>
              <button
                onClick={() => setShowNewFlightForm(false)}
                className="p-1 hover:bg-slate-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NewFlightForm
              aircraftList={aircraftList}
              users={users}
              onSuccess={handleNewFlightSuccess}
              onCancel={() => setShowNewFlightForm(false)}
            />
          </div>
        </div>
      )}
      {editingFlight ? (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Modifier le vol</h2>
          <EditFlightForm
            flight={editingFlight}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingFlight(null)}
            aircraftList={aircraftList}
            users={users}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vols</h1>
              <p className="text-slate-600">
                {hasAnyGroup(user, ["ADMIN"])
                  ? "Tous les vols"
                  : hasAnyGroup(user, ["INSTRUCTOR"])
                  ? "Vos vols et ceux de vos élèves"
                  : "Vos vols"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filtres</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Exporter</span>
              </button>

              {(hasAnyGroup(user, ["ADMIN"]) ||
                hasAnyGroup(user, ["INSTRUCTOR"]) ||
                hasAnyGroup(user, ["PILOT"])) && (
                <button
                  onClick={() => setShowNewFlightForm(true)}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouveau vol</span>
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <FlightFilters
              filters={filters}
              onFiltersChange={setFilters}
              aircraftList={aircraftList}
              users={instructorStudents}
              onClose={() => setShowFilters(false)}
            />
          )}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              {hasAnyGroup(user, ["ADMIN"]) 
                ? filters.memberId 
                  ? "Vols du membre sélectionné"
                  : "Tous les vols"
                : "Vos vols personnels"
              }
            </h1>
            <div className="flex items-center space-x-4">
              <select
                className="border rounded-md px-2 py-1 text-sm bg-white"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1); // Réinitialiser à la première page lors du changement de taille
                }}
              >
                <option value="50">50 par page</option>
                <option value="100">100 par page</option>
                <option value="500">500 par page</option>
                <option value="1000">1000 par page</option> 
              </select>
            </div>
          </div>

          {hasAnyGroup(user, ["INSTRUCTOR"]) ? (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Vos vols personnels</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-600">Temps de vol total</div>
                    <div className="text-2xl font-semibold">{formatDuration(personalFlightTotals.totalTime)}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-600">Montant total</div>
                    <div className="text-2xl font-semibold">{personalFlightTotals.totalCost.toFixed(2)} €</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left p-4 font-medium text-slate-600 max-w-[120px]">
                          Nom
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600 w-[100px]">
                          Date du vol
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600 w-[80px]">
                          Appareil
                        </th>
                        <th className="text-center p-4 font-medium text-slate-600 w-[40px]">
                          Horamètre
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600 w-[100px]">
                          Type de vol
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600 max-w-[120px]">
                          Instructeur
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600 w-[80px]">
                          Durée
                        </th>
                        <th className="text-right p-4 font-medium text-slate-600 w-[100px]">
                          Coût total
                        </th>
                        <th className="text-right p-4 font-medium text-slate-600 w-[100px]">
                          Dont instruction
                        </th>
                        <th className="text-center p-4 font-medium text-slate-600">
                          Validé
                        </th>
                        <th className="text-center p-4 font-medium text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {personalPaginatedFlights.map((flight) => {
                        const aircraft = aircraftList.find(
                          (a) => a.id === flight.aircraftId
                        );
                        const pilot = users.find((u) => u.id === flight.userId);
                        const instructor = users.find(
                          (u) => u.id === flight.instructorId
                        );

                        console.log('Personal Flight details:', {
                          id: flight.id,
                          date: flight.date,
                          pilot: pilot ? `${pilot.first_name} ${pilot.last_name}` : 'N/A',
                          instructor: instructor ? `${instructor.first_name} ${instructor.last_name}` : 'N/A',
                          cost: flight.cost,
                          instructorCost: flight.instructorCost,
                          instructorId: flight.instructorId,
                          flightType: flight.flightType,
                        });

                        const { isConsistent, previousFlight } = checkHourMeterConsistency(flight, personalPaginatedFlights);

                        return (
                          <tr
                            key={flight.id}
                            className={`border-b border-slate-100 hover:bg-slate-50 ${
                              !isConsistent || inconsistentFlights.has(flight.id) ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="p-4 truncate max-w-[120px]" title={pilot ? `${pilot.first_name} ${pilot.last_name}` : "N/A"}>
                              {pilot && (
                                <button
                                  onClick={() => navigate(`/members/${pilot.id}`)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                                >
                                  {pilot.first_name} {pilot.last_name}
                                </button>
                              )}
                            </td>
                            <td className="p-4">
                              {new Date(flight.date).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              {aircraft?.registration || "N/A"}
                            </td>
                            <td className="p-4 text-center">
                              {flight.start_hour_meter && flight.end_hour_meter && (
                                <div className="flex items-center justify-center gap-2">
                                  <Timer 
                                    size={20} 
                                    className={
                                      isConsistent && !inconsistentFlights.has(flight.id)
                                      ? "text-green-600"
                                      : "text-red-600"
                                    }
                                    title={`Horamètre départ: ${flight.start_hour_meter}, fin: ${flight.end_hour_meter}${
                                      !isConsistent ? " ⚠️ Incohérence avec le vol précédent" : 
                                      inconsistentFlights.has(flight.id) ? " ⚠️ Vol lié à une incohérence" : ""
                                    }`}
                                  />
                                  <span className="text-xs text-slate-600">
                                    {flight.start_hour_meter} → {flight.end_hour_meter}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              {flightTypes[flight.flightTypeId] ||
                                flight.flightTypeId}
                            </td>
                            <td className="p-4 truncate max-w-[120px]" title={instructor ? `${instructor.first_name} ${instructor.last_name}` : "-"}>
                              {instructor && (
                                <button
                                  onClick={() => navigate(`/members/${instructor.id}`)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                                >
                                  {instructor.first_name} {instructor.last_name}
                                </button>
                              )}
                            </td>
                            <td className="p-4">
                              {formatDuration(flight.duration)}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end">
                                <span className={`${flight.flightType?.accounting_category?.is_club_paid ? 'text-green-600 font-medium' : ''}`}>
                                  {flight.flightType?.accounting_category?.is_club_paid 
                                    ? '0.00 €' 
                                    : `${(flight.cost + (flight.instructorCost || 0)).toFixed(2)} €`}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              {flight.instructorCost ? flight.instructorCost.toFixed(2) : "-"}
                            </td>
                            <td className="p-4 text-center">
                              {hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id && (
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(flight.userId);
                                    setSelectedFlightId(flight.id);
                                    setShowCompetenciesModal(true);
                                  }}
                                  className="text-purple-600 hover:text-purple-800"
                                  title="Gérer les compétences"
                                >
                                  <GraduationCap size={20} />
                                </button>
                              )}
                              {!flight.validated && hasAnyGroup(user, ["ADMIN"]) ? (
                                <button
                                  onClick={() => handleValidateFlight(flight)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Valider"
                                >
                                  <Check size={20} />
                                </button>
                              ) : flight.validated ? (
                                <span className="text-green-600" title="Vol validé">
                                  <CheckCircle2 size={20} />
                                </span>
                              ) : null}
                            </td>
                            <td className="p-4 flex justify-center gap-2">
                              {(hasAnyGroup(user, ["ADMIN"]) || !flight.validated) && (
                                <>
                                  {(hasAnyGroup(user, ["ADMIN"]) || 
                                    flight.userId === user?.id || 
                                    (hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id)
                                  ) && (
                                    <button
                                      onClick={() => setEditingFlight(flight)}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Modifier"
                                    >
                                      <Edit size={20} />
                                    </button>
                                  )}
                                  {(hasAnyGroup(user, ["ADMIN"]) || 
                                    (!flight.validated && (
                                      flight.userId === user?.id || 
                                      (hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id)
                                    ))
                                  ) && (
                                    <button
                                      onClick={() => handleDeleteFlight(flight)}
                                      className="text-red-600 hover:text-red-800"
                                      title="Supprimer"
                                    >
                                      <Trash2 size={20} />
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {renderStudentFlights()}
            </>
          ) : (
            <>
              <FlightTotals flights={filteredFlights} showByCategory={true} />

              <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-4 font-medium text-slate-600 max-w-[120px]">
                        Nom
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600 w-[100px]">
                        Date du vol
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600 w-[80px]">
                        Appareil
                      </th>
                      <th className="text-center p-4 font-medium text-slate-600 w-[40px]">
                        Horamètre
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600 w-[100px]">
                        Type de vol
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600 max-w-[120px]">
                        Instructeur
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600 w-[80px]">
                        Durée
                      </th>
                      <th className="text-right p-4 font-medium text-slate-600 w-[100px]">
                        Coût total
                      </th>
                      <th className="text-right p-4 font-medium text-slate-600 w-[100px]">
                        Dont instruction
                      </th>
                      <th className="text-center p-4 font-medium text-slate-600">
                        Validé
                      </th>
                      <th className="text-center p-4 font-medium text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalPaginatedFlights.map((flight) => {
                      const aircraft = aircraftList.find(
                        (a) => a.id === flight.aircraftId
                      );
                      const pilot = users.find((u) => u.id === flight.userId);
                      const instructor = users.find(
                        (u) => u.id === flight.instructorId
                      );

                      console.log('Personal Flight details:', {
                        id: flight.id,
                        date: flight.date,
                        pilot: pilot ? `${pilot.first_name} ${pilot.last_name}` : 'N/A',
                        instructor: instructor ? `${instructor.first_name} ${instructor.last_name}` : 'N/A',
                        cost: flight.cost,
                        instructorCost: flight.instructorCost,
                        instructorId: flight.instructorId,
                        flightType: flight.flightType,
                      });

                      const { isConsistent, previousFlight } = checkHourMeterConsistency(flight, personalPaginatedFlights);

                      return (
                        <tr
                          key={flight.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${
                            !isConsistent || inconsistentFlights.has(flight.id) ? 'bg-red-50' : ''
                          }`}
                        >
                          <td className="p-4 truncate max-w-[120px]" title={pilot ? `${pilot.first_name} ${pilot.last_name}` : "N/A"}>
                            {pilot && (
                              <button
                                onClick={() => navigate(`/members/${pilot.id}`)}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                              >
                                {pilot.first_name} {pilot.last_name}
                              </button>
                            )}
                          </td>
                          <td className="p-4">
                            {new Date(flight.date).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            {aircraft?.registration || "N/A"}
                          </td>
                          <td className="p-4 text-center">
                            {flight.start_hour_meter && flight.end_hour_meter && (
                              <div className="flex items-center justify-center gap-2">
                                <Timer 
                                  size={20} 
                                  className={
                                    isConsistent && !inconsistentFlights.has(flight.id)
                                    ? "text-green-600"
                                    : "text-red-600"
                                  }
                                  title={`Horamètre départ: ${flight.start_hour_meter}, fin: ${flight.end_hour_meter}${
                                    !isConsistent ? " ⚠️ Incohérence avec le vol précédent" : 
                                    inconsistentFlights.has(flight.id) ? " ⚠️ Vol lié à une incohérence" : ""
                                  }`}
                                />
                                <span className="text-xs text-slate-600">
                                  {flight.start_hour_meter} → {flight.end_hour_meter}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {flightTypes[flight.flightTypeId] ||
                              flight.flightTypeId}
                          </td>
                          <td className="p-4 truncate max-w-[120px]" title={instructor ? `${instructor.first_name} ${instructor.last_name}` : "-"}>
                            {instructor && (
                              <button
                                onClick={() => navigate(`/members/${instructor.id}`)}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                              >
                                {instructor.first_name} {instructor.last_name}
                              </button>
                            )}
                          </td>
                          <td className="p-4">
                            {formatDuration(flight.duration)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end">
                              <span className={`${flight.flightType?.accounting_category?.is_club_paid ? 'text-green-600 font-medium' : ''}`}>
                                {flight.flightType?.accounting_category?.is_club_paid 
                                  ? '0.00 €' 
                                  : `${(flight.cost + (flight.instructorCost || 0)).toFixed(2)} €`}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {flight.instructorCost ? flight.instructorCost.toFixed(2) : "-"}
                          </td>
                          <td className="p-4 text-center">
                            {hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id && (
                              <button
                                onClick={() => {
                                  setSelectedStudentId(flight.userId);
                                  setSelectedFlightId(flight.id);
                                  setShowCompetenciesModal(true);
                                }}
                                className="text-purple-600 hover:text-purple-800"
                                title="Gérer les compétences"
                              >
                                <GraduationCap size={20} />
                              </button>
                            )}
                            {!flight.validated && hasAnyGroup(user, ["ADMIN"]) ? (
                              <button
                                onClick={() => handleValidateFlight(flight)}
                                className="text-green-600 hover:text-green-800"
                                title="Valider"
                              >
                                <Check size={20} />
                              </button>
                            ) : flight.validated ? (
                              <span className="text-green-600" title="Vol validé">
                                <CheckCircle2 size={20} />
                              </span>
                            ) : null}
                          </td>
                          <td className="p-4 flex justify-center gap-2">
                            {(hasAnyGroup(user, ["ADMIN"]) || !flight.validated) && (
                              <>
                                {(hasAnyGroup(user, ["ADMIN"]) || 
                                  flight.userId === user?.id || 
                                  (hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id)
                                ) && (
                                  <button
                                    onClick={() => setEditingFlight(flight)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Modifier"
                                  >
                                    <Edit size={20} />
                                  </button>
                                )}
                                {(hasAnyGroup(user, ["ADMIN"]) || 
                                  (!flight.validated && (
                                    flight.userId === user?.id || 
                                    (hasAnyGroup(user, ["INSTRUCTOR"]) && flight.instructorId === user?.id)
                                  ))
                                ) && (
                                  <button
                                    onClick={() => handleDeleteFlight(flight)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Supprimer"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            {filteredFlights.length > 0 
              ? `Affichage de ${(currentPage - 1) * pageSize + 1} à ${Math.min(currentPage * pageSize, filteredFlights.length)}`
              : "Aucun vol"} sur {filteredFlights.length} vol{filteredFlights.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded px-3 py-1 text-sm font-medium disabled:opacity-50
                     bg-white text-gray-700 border border-gray-300 hover:bg-gray-50
                     disabled:hover:bg-white"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} sur {Math.max(1, Math.ceil(filteredFlights.length / pageSize))}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage >= Math.ceil(filteredFlights.length / pageSize)}
            className="rounded px-3 py-1 text-sm font-medium disabled:opacity-50
                     bg-white text-gray-700 border border-gray-300 hover:bg-gray-50
                     disabled:hover:bg-white"
          >
            Suivant
          </button>
        </div>
      </div>

      {showCompetenciesModal && selectedStudentId && selectedFlightId && (
        <CompetenciesModal
          studentId={selectedStudentId}
          flightId={selectedFlightId}
          onClose={() => {
            setShowCompetenciesModal(false);
            setSelectedStudentId(null);
            setSelectedFlightId(null);
          }}
        />
      )}
    </div>
  );
};

export default FlightList;
