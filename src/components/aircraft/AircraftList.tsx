import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Plus, AlertTriangle, ArrowUpDown } from "lucide-react";
import type { Aircraft } from "../../types/database";
import { getAircraft } from "../../lib/queries/aircraft";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import AircraftCard from "./AircraftCard";
import EditAircraftModal from "./EditAircraftModal";
import AircraftDetailsModal from "./AircraftDetailsModal";
import AircraftOrderModal from "./AircraftOrderModal";
import { toast } from "react-hot-toast";

const AircraftList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = hasAnyGroup(user, ["ADMIN", "MECHANIC"]);
  const canAdd = hasAnyGroup(user, ["ADMIN"]);
  const canAccessMaintenance = hasAnyGroup(user, ["ADMIN", "MECHANIC"]);
  const canReorder = hasAnyGroup(user, ["ADMIN"]);

  const loadAircraft = async () => {
    try {
      setLoading(true);
      const data = await getAircraft();
      setAircraft(data);
      setError(null);
    } catch (err) {
      console.error("Error loading aircraft:", err);
      setError("Error loading aircraft");
      toast.error("Error loading aircraft");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAircraft();
  }, []);

  const filteredAircraft = aircraft.filter((a) => {
    const matchesSearch =
      a.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" ||
      a.status.toLowerCase() === selectedStatus.toLowerCase();

    // N'afficher les avions indisponibles qu'aux admin et mécaniciens
    const canSeeUnavailable = hasAnyGroup(user, ["ADMIN", "MECHANIC"]);
    if (!canSeeUnavailable && a.status.toLowerCase() === "unavailable") {
      return false;
    }

    return matchesSearch && matchesStatus;
  });

  const maintenanceWarnings = aircraft.filter(
    (a) => a.hoursBeforeMaintenance <= 10
  ).length;

  const handleAircraftUpdate = async () => {
    await loadAircraft();
    setSelectedAircraft(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appareils</h1>
          <p className="text-slate-600">Gestion de la flotte</p>
        </div>

        <div className="flex items-center gap-4">
          {maintenanceWarnings > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-800 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {maintenanceWarnings} maintenance
                {maintenanceWarnings > 1 ? "s" : ""} à prévoir
              </span>
            </div>
          )}
          {canReorder && (
            <button
              onClick={() => setIsReordering(true)}
              className="btn btn-secondary flex items-center space-x-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span>Réorganiser</span>
            </button>
          )}
          {canAdd && (
            <button 
              onClick={() => setIsCreating(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter un appareil</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un appareil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="maintenance">En maintenance</option>
              <option value="unavailable">Indisponible</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filtres</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type d'appareil
                </label>
                <select className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500">
                  <option value="all">Tous</option>
                  <option value="PLANE">Avion</option>
                  <option value="ULM">ULM</option>
                  <option value="HELICOPTER">Hélicoptère</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Maintenance
                </label>
                <select className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500">
                  <option value="all">Tous</option>
                  <option value="urgent">Maintenance urgente (&lt;5h)</option>
                  <option value="upcoming">Maintenance à prévoir (&lt;10h)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAircraft.map((aircraft) => (
          <AircraftCard
            key={aircraft.id}
            aircraft={aircraft}
            onView={() => setSelectedAircraft(aircraft)}
            onEdit={() => {
              setSelectedAircraft(aircraft);
              setIsEditing(true);
            }}
            canEdit={canEdit}
            onReserve={() => navigate(`/reservations?aircraft=${aircraft.id}`)}
          />
        ))}
      </div>

      {(isEditing || isCreating) && (
        <EditAircraftModal
          aircraft={isCreating ? null : selectedAircraft}
          onClose={() => {
            setIsEditing(false);
            setIsCreating(false);
            setSelectedAircraft(null);
          }}
          onSuccess={handleAircraftUpdate}
        />
      )}

      {selectedAircraft && !isEditing && !isCreating && (
        <AircraftDetailsModal
          aircraft={selectedAircraft}
          onClose={() => setSelectedAircraft(null)}
          onEdit={
            canEdit
              ? () => {
                  setIsEditing(true);
                }
              : undefined
          }
          onUpdate={handleAircraftUpdate}
        />
      )}

      {isReordering && (
        <AircraftOrderModal
          aircraft={aircraft}
          onClose={() => setIsReordering(false)}
          onSuccess={loadAircraft}
        />
      )}
    </div>
  );
};

export default AircraftList;