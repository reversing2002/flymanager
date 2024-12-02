import { useState, useEffect } from "react";
import { Filter, Plus, X, Trash2 } from "lucide-react";
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

  const [filters, setFilters] = useState({
    dateRange: "all",
    startDate: "",
    endDate: "",
    aircraftTypes: [],
    aircraftIds: [],
    flightTypes: [],
    validated: "all",
    paymentMethods: [],
    accountingCategories: [],
  });

  const [personalFlights, setPersonalFlights] = useState<Flight[]>([]);
  const [studentFlights, setStudentFlights] = useState<Flight[]>([]);

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
        .select("id, name, requires_instructor, accounting_category");

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
    // Apply filters
    let filtered = [...flights];

    // Filter by date range
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

    // Filter by aircraft type
    if (filters.aircraftTypes.length > 0) {
      filtered = filtered.filter((flight) => {
        const aircraft = aircraftList.find((a) => a.id === flight.aircraftId);
        return aircraft && filters.aircraftTypes.includes(aircraft.type);
      });
    }

    // Filter by specific aircraft
    if (filters.aircraftIds.length > 0) {
      filtered = filtered.filter((flight) =>
        filters.aircraftIds.includes(flight.aircraftId)
      );
    }

    // Filter by flight type
    if (filters.flightTypes.length > 0) {
      filtered = filtered.filter((flight) =>
        filters.flightTypes.includes(flight.flightTypeId)
      );
    }

    // Filter by accounting category
    if (filters.accountingCategories.length > 0) {
      filtered = filtered.filter((flight) =>
        filters.accountingCategories.includes(flight.accountingCategory)
      );
    }

    // Filter by validation status
    if (filters.validated !== "all") {
      filtered = filtered.filter((flight) =>
        filters.validated === "yes" ? flight.isValidated : !flight.isValidated
      );
    }

    // Filter by payment method
    if (filters.paymentMethods.length > 0) {
      filtered = filtered.filter((flight) =>
        filters.paymentMethods.includes(flight.paymentMethod)
      );
    }

    setFilteredFlights(filtered);
  }, [flights, filters, aircraftList]);

  const handleNewFlightSuccess = async () => {
    await loadData();
    setShowNewFlightForm(false);
  };

  const handleEditClick = (flight: Flight) => {
    if (!user || (!hasAnyGroup(user, ["ADMIN"]) && flight.isValidated)) return;
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
    if (!flight.isValidated) {
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
    return !flight.isValidated && (
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
          >
            Modifier
          </button>
        )}
        {hasAnyGroup(user, ["ADMIN"]) && !flight.isValidated && (
          <button
            onClick={() => handleValidateFlight(flight)}
            className="text-green-600 hover:text-green-800"
          >
            Valider
          </button>
        )}
        {!flight.isValidated && (hasAnyGroup(user, ["ADMIN"]) || flight.userId === user.id) && (
          <button
            onClick={() => handleDeleteFlight(flight)}
            className="text-red-600 hover:text-red-800"
          >
            Supprimer
          </button>
        )}
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
                          Taux horaire
                        </th>
                        <th className="text-right p-4 font-medium text-slate-600">
                          Prix du vol
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600">
                          Mode de paiement
                        </th>
                        <th className="text-center p-4 font-medium text-slate-600">
                          Validé
                        </th>
                        <th className="text-center p-4 font-medium text-slate-600 min-w-[100px]">
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
                              {flight.hourlyRate?.toFixed(2) || "N/A"}
                            </td>
                            <td className="p-4 text-right">
                              {flight.cost?.toFixed(2) || "N/A"}
                            </td>
                            <td className="p-4">
                              {flight.paymentMethod === "ACCOUNT"
                                ? "Compte"
                                : flight.paymentMethod === "CARD"
                                ? "Carte"
                                : flight.paymentMethod === "CASH"
                                ? "Espèces"
                                : "Virement"}
                            </td>
                            <td className="p-4 text-center">
                              {flight.isValidated ? "Oui" : "Non"}
                            </td>
                            <td className="p-4 text-center">
                              {renderActionButtons(flight)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

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
                          Taux horaire
                        </th>
                        <th className="text-right p-4 font-medium text-slate-600">
                          Prix du vol
                        </th>
                        <th className="text-left p-4 font-medium text-slate-600">
                          Mode de paiement
                        </th>
                        <th className="text-center p-4 font-medium text-slate-600">
                          Validé
                        </th>
                        <th className="text-center p-4 font-medium text-slate-600 min-w-[100px]">
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
                              {flight.hourlyRate?.toFixed(2) || "N/A"}
                            </td>
                            <td className="p-4 text-right">
                              {flight.cost?.toFixed(2) || "N/A"}
                            </td>
                            <td className="p-4">
                              {flight.paymentMethod === "ACCOUNT"
                                ? "Compte"
                                : flight.paymentMethod === "CARD"
                                ? "Carte"
                                : flight.paymentMethod === "CASH"
                                ? "Espèces"
                                : "Virement"}
                            </td>
                            <td className="p-4 text-center">
                              {flight.isValidated ? "Oui" : "Non"}
                            </td>
                            <td className="p-4 text-center">
                              {renderActionButtons(flight)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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
                        Taux horaire
                      </th>
                      <th className="text-right p-4 font-medium text-slate-600">
                        Prix du vol
                      </th>
                      <th className="text-left p-4 font-medium text-slate-600">
                        Mode de paiement
                      </th>
                      <th className="text-center p-4 font-medium text-slate-600">
                        Validé
                      </th>
                      <th className="text-center p-4 font-medium text-slate-600 min-w-[100px]">
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
                            {flight.hourlyRate?.toFixed(2) || "N/A"}
                          </td>
                          <td className="p-4 text-right">
                            {flight.cost?.toFixed(2) || "N/A"}
                          </td>
                          <td className="p-4">
                            {flight.paymentMethod === "ACCOUNT"
                              ? "Compte"
                              : flight.paymentMethod === "CARD"
                              ? "Carte"
                              : flight.paymentMethod === "CASH"
                              ? "Espèces"
                              : "Virement"}
                          </td>
                          <td className="p-4 text-center">
                            {flight.isValidated ? "Oui" : "Non"}
                          </td>
                          <td className="p-4 text-center">
                            {renderActionButtons(flight)}
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
    </div>
  );
};

export default FlightList;