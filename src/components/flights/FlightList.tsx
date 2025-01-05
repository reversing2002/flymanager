import { useState, useEffect } from "react";
import { Filter, Plus, X, Trash2, Check, Edit, CheckCircle2, GraduationCap } from "lucide-react";
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

const FlightList = () => {
  const { user } = useAuth();
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

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [flightsData, aircraftData, usersData] = await Promise.all([
        getFlights(),
        getAircraft(),
        getUsers(),
      ]);

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

      if (hasAnyGroup(user, ["ADMIN"])) {
        // Admin voit tous les vols
        setFlights(flightsData);
      } else if (hasAnyGroup(user, ["INSTRUCTOR"])) {
        const personal = flightsData.filter(
          (flight) => flight.userId === user.id
        );
        const students = flightsData.filter(
          (flight) =>
            flight.instructorId === user.id && flight.userId !== user.id
        );
        setPersonalFlights(personal);
        setStudentFlights(students);
        setFlights([...personal, ...students]);
      } else {
        // Pilote ne voit que ses vols
        setFlights(
          flightsData.filter((flight) => flight.userId === user.id)
        );
      }

      setAircraftList(aircraftData);
      setUsers(usersData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Erreur lors du chargement des données");
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    let filtered = [...flights];

    // Filtrage par date
    if (filters.dateRange !== "all") {
      filtered = filtered.filter((flight) => {
        const flightDate = new Date(flight.date);
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;

        if (start && end) {
          return flightDate >= start && flightDate <= end;
        }
        return true;
      });
    }

    // Filtrage par membre
    if (filters.memberId) {
      filtered = filtered.filter(
        (flight) =>
          flight.userId === filters.memberId ||
          flight.instructorId === filters.memberId
      );
    }

    // Autres filtres existants
    if (filters.aircraftTypes.length > 0) {
      const aircraftOfType = aircraftList
        .filter((a) => filters.aircraftTypes.includes(a.type))
        .map((a) => a.id);
      filtered = filtered.filter((f) => aircraftOfType.includes(f.aircraftId));
    }

    if (filters.aircraftIds.length > 0) {
      filtered = filtered.filter((f) => filters.aircraftIds.includes(f.aircraftId));
    }

    if (filters.flightTypes.length > 0) {
      filtered = filtered.filter((f) => filters.flightTypes.includes(f.flightTypeId));
    }

    if (filters.accountingCategories.length > 0) {
      filtered = filtered.filter((flight) => {
        const flightType = flightTypes[flight.flightTypeId];
        return (
          flightType &&
          flightType.accounting_category &&
          filters.accountingCategories.includes(
            flightType.accounting_category.id
          )
        );
      });
    }

    if (filters.validated !== "all") {
      filtered = filtered.filter(
        (f) => (f.validated ? "yes" : "no") === filters.validated
      );
    }

    setFilteredFlights(filtered);
  }, [flights, filters, aircraftList, flightTypes]);

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
    if (!flight.validated) {
      try {
        await deleteFlight(flight.id);
        toast.success("Vol supprimé avec succès");
        loadData();
      } catch (error) {
        console.error("Error deleting flight:", error);
        toast.error("Erreur lors de la suppression du vol");
      }
    } else {
      toast.error("Impossible de supprimer un vol validé");
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
          (!flight.isValidated && (
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

  const renderStudentFlights = () => {
    if (!studentFlights.length) return null;
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Vols de vos élèves
        </h2>
        <div className="mb-4 text-slate-600">
          Temps total d'instruction:{" "}
          {formatDuration(
            studentFlights.reduce(
              (acc, flight) => acc + flight.duration,
              0
            )
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-4 font-medium text-slate-600">
                  Nom
                </th>
                <th className="text-left p-4 font-medium text-slate-600">
                  Date du vol
                </th>
                <th className="text-left p-4 font-medium text-slate-600">
                  Appareil
                </th>
                <th className="text-left p-4 font-medium text-slate-600">
                  Type de vol
                </th>
                <th className="text-left p-4 font-medium text-slate-600">
                  Instructeur
                </th>
                <th className="text-left p-4 font-medium text-slate-600">
                  Durée
                </th>
                <th className="text-right p-4 font-medium text-slate-600">
                  Coût total
                </th>
                <th className="text-right p-4 font-medium text-slate-600">
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
              {studentFlights.map((flight) => {
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

                return (
                  <tr
                    key={flight.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-4">
                      {pilot
                        ? `${pilot.first_name} ${pilot.last_name}`
                        : "N/A"}
                    </td>
                    <td className="p-4">
                      {new Date(flight.date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {aircraft?.registration || "N/A"}
                    </td>
                    <td className="p-4">
                      {flightTypes[flight.flightTypeId] ||
                        flight.flightTypeId}
                    </td>
                    <td className="p-4">
                      {instructor
                        ? `${instructor.first_name} ${instructor.last_name}`
                        : "-"}
                    </td>
                    <td className="p-4">
                      {formatDuration(flight.duration)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center">
                        <span className={`${flight.flightType?.accounting_category?.is_club_paid ? 'text-green-600 font-medium' : ''}`}>
                          {flight.flightType?.accounting_category?.is_club_paid ? '0.00 €' : `${flight.cost.toFixed(2)} €`}
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
                      {!flight.isValidated && hasAnyGroup(user, ["ADMIN"]) ? (
                        <button
                          onClick={() => handleValidateFlight(flight)}
                          className="text-green-600 hover:text-green-800"
                          title="Valider"
                        >
                          <Check size={20} />
                        </button>
                      ) : flight.isValidated ? (
                        <span className="text-green-600" title="Vol validé">
                          <CheckCircle2 size={20} />
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      {(hasAnyGroup(user, ["ADMIN"]) || !flight.isValidated) && (
                        <>
                          {(hasAnyGroup(user, ["ADMIN"]) ||
                            flight.userId === user?.id ||
                            (hasAnyGroup(user, ["INSTRUCTOR"]) &&
                              flight.instructorId === user?.id)
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
                            (!flight.isValidated &&
                              (flight.userId === user?.id ||
                                (hasAnyGroup(user, ["INSTRUCTOR"]) &&
                                  flight.instructorId === user?.id)
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
              onClose={() => setShowFilters(false)}
              users={users}
            />
          )}

          {hasAnyGroup(user, ["INSTRUCTOR"]) ? (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                  Vos vols personnels
                </h2>
                <FlightTotals flights={personalFlights} showByCategory={true} />
                <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left p-4 font-medium text-slate-600">
                          Nom
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600">
                          Date du vol
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600">
                          Appareil
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600">
                          Type de vol
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600">
                          Instructeur
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600">
                          Durée
                        </th>
                        <th className="text-right p-4 font-medium text-slate-600">
                          Coût total
                        </th>
                        <th className="text-right p-4 font-medium text-slate-600">
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
                      {personalFlights.map((flight) => {
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

                        return (
                          <tr
                            key={flight.id}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="p-4">
                              {pilot
                                ? `${pilot.first_name} ${pilot.last_name}`
                                : "N/A"}
                            </td>
                            <td className="p-4">
                              {new Date(flight.date).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              {aircraft?.registration || "N/A"}
                            </td>
                            <td className="p-4">
                              {flightTypes[flight.flightTypeId] ||
                                flight.flightTypeId}
                            </td>
                            <td className="p-4">
                              {instructor
                                ? `${instructor.first_name} ${instructor.last_name}`
                                : "-"}
                            </td>
                            <td className="p-4">
                              {formatDuration(flight.duration)}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center">
                                <span className={`${flight.flightType?.accounting_category?.is_club_paid ? 'text-green-600 font-medium' : ''}`}>
                                  {flight.flightType?.accounting_category?.is_club_paid ? '0.00 €' : `${flight.cost.toFixed(2)} €`}
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
                              {!flight.isValidated && hasAnyGroup(user, ["ADMIN"]) ? (
                                <button
                                  onClick={() => handleValidateFlight(flight)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Valider"
                                >
                                  <Check size={20} />
                                </button>
                              ) : flight.isValidated ? (
                                <span className="text-green-600" title="Vol validé">
                                  <CheckCircle2 size={20} />
                                </span>
                              ) : null}
                            </td>
                            <td className="p-4 flex justify-center gap-2">
                              {(hasAnyGroup(user, ["ADMIN"]) || !flight.isValidated) && (
                                <>
                                  {(hasAnyGroup(user, ["ADMIN"]) ||
                                    flight.userId === user?.id ||
                                    (hasAnyGroup(user, ["INSTRUCTOR"]) &&
                                      flight.instructorId === user?.id)
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
                                    (!flight.isValidated &&
                                      (flight.userId === user?.id ||
                                        (hasAnyGroup(user, ["INSTRUCTOR"]) &&
                                          flight.instructorId === user?.id)
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
                      <th className="text-left p-4 font-medium text-slate-600">
                        Nom
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600">
                        Date du vol
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600">
                        Appareil
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600">
                        Type de vol
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600">
                        Instructeur
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600">
                        Durée
                      </th>
                      <th className="text-right p-4 font-medium text-slate-600">
                        Coût total
                      </th>
                      <th className="text-right p-4 font-medium text-slate-600">
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
                    {filteredFlights.map((flight) => {
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

                      return (
                        <tr
                          key={flight.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-4">
                            {pilot
                              ? `${pilot.first_name} ${pilot.last_name}`
                              : "N/A"}
                          </td>
                          <td className="p-4">
                            {new Date(flight.date).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            {aircraft?.registration || "N/A"}
                          </td>
                          <td className="p-4">
                            {flightTypes[flight.flightTypeId] ||
                              flight.flightTypeId}
                          </td>
                          <td className="p-4">
                            {instructor
                              ? `${instructor.first_name} ${instructor.last_name}`
                              : "-"}
                          </td>
                          <td className="p-4">
                            {formatDuration(flight.duration)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center">
                              <span className={`${flight.flightType?.accounting_category?.is_club_paid ? 'text-green-600 font-medium' : ''}`}>
                                {flight.flightType?.accounting_category?.is_club_paid ? '0.00 €' : `${flight.cost.toFixed(2)} €`}
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
                            {!flight.isValidated && hasAnyGroup(user, ["ADMIN"]) ? (
                              <button
                                onClick={() => handleValidateFlight(flight)}
                                className="text-green-600 hover:text-green-800"
                                title="Valider"
                              >
                                <Check size={20} />
                              </button>
                            ) : flight.isValidated ? (
                              <span className="text-green-600" title="Vol validé">
                                <CheckCircle2 size={20} />
                              </span>
                            ) : null}
                          </td>
                          <td className="p-4 flex justify-center gap-2">
                            {(hasAnyGroup(user, ["ADMIN"]) || !flight.isValidated) && (
                              <>
                                {(hasAnyGroup(user, ["ADMIN"]) ||
                                  flight.userId === user?.id ||
                                  (hasAnyGroup(user, ["INSTRUCTOR"]) &&
                                    flight.instructorId === user?.id)
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
                                  (!flight.isValidated &&
                                    (flight.userId === user?.id ||
                                      (hasAnyGroup(user, ["INSTRUCTOR"]) &&
                                        flight.instructorId === user?.id)
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