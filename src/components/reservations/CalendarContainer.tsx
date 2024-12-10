import { useState, useEffect } from "react";
import ReservationCalendar from "./ReservationCalendar";
import HorizontalReservationCalendar from "./HorizontalReservationCalendar";
import { LayoutGrid, Table, Filter } from "lucide-react";
import FilterPanel, { FilterState } from "./FilterPanel";
import type { Aircraft, User } from "../../types/database";
import { getAircraft, getUsers } from "../../lib/queries";
import { toast } from "react-hot-toast";

const CalendarContainer = () => {
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    aircraftTypes: [],
    instructors: [],
    status: "all",
    availability: "all",
  });
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [aircraftData, usersData] = await Promise.all([
        getAircraft(),
        getUsers(),
      ]);
      setAircraft(aircraftData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header avec switch de vue et filtres */}
      <div className="flex items-center justify-between p-2 border-b bg-white">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50"
        >
          <Filter className="h-4 w-4" />
          <span>Filtres</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-2">Vue :</span>
          <button
            onClick={() => setIsHorizontal(false)}
            className={`p-2 rounded-l-md border ${
              !isHorizontal
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white hover:bg-gray-50"
            }`}
            title="Vue verticale"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsHorizontal(true)}
            className={`p-2 rounded-r-md border -ml-[1px] ${
              isHorizontal
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white hover:bg-gray-50"
            }`}
            title="Vue horizontale"
          >
            <Table className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Panel de filtres */}
      {showFilters && (
        <FilterPanel
          aircraft={aircraft}
          users={users}
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Calendrier */}
      <div className="flex-1 overflow-hidden">
        {isHorizontal ? (
          <HorizontalReservationCalendar
            filters={filters}
          />
        ) : (
          <ReservationCalendar
            filters={filters}
          />
        )}
      </div>
    </div>
  );
};

export default CalendarContainer;
