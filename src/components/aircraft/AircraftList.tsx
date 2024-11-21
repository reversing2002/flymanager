import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Plus, AlertTriangle, Wrench, MessageSquare } from "lucide-react";
import type { Aircraft } from "../../types/database";
import { getAircraft } from "../../lib/queries/aircraft";
import { useAuth } from "../../contexts/AuthContext";
import AircraftDetailsModal from "./AircraftDetailsModal";
import EditAircraftModal from "./EditAircraftModal";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === "ADMIN" || user?.role === "MECHANIC";
  const canAdd = user?.role === "ADMIN";
  const canAccessMaintenance = user?.role === "ADMIN" || user?.role === "MECHANIC";

  const loadAircraft = async () => {
    try {
      setLoading(true);
      const data = await getAircraft();
      setAircraft(data);
      setError(null);
    } catch (err) {
      console.error("Erreur lors du chargement des appareils:", err);
      setError("Erreur lors du chargement des appareils");
      toast.error("Erreur lors du chargement des appareils");
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

    return matchesSearch && matchesStatus;
  });

  const maintenanceWarnings = aircraft.filter(
    (a) => a.hoursBeforeMaintenance <= 10
  ).length;

  const handleAircraftUpdate = (updatedAircraft: Aircraft) => {
    setAircraft((prevAircraft) =>
      prevAircraft.map((a) =>
        a.id === updatedAircraft.id ? updatedAircraft : a
      )
    );
    setSelectedAircraft(updatedAircraft);
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
          {canAdd && (
            <button className="btn btn-primary flex items-center space-x-2">
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
                  <option value="upcoming">
                    Maintenance à prévoir (&lt;10h)
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAircraft.map((aircraft) => (
          <div key={aircraft.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="aspect-w-16 aspect-h-9 relative">
              <img
                src={aircraft.imageUrl || "https://images.unsplash.com/photo-1583396618422-6af71b6fb4b3?auto=format&fit=crop&q=80&w=800&h=600"}
                alt={aircraft.registration}
                className="object-cover w-full h-full"
              />
              <div className="absolute top-4 right-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    aircraft.status === "AVAILABLE"
                      ? "bg-emerald-100 text-emerald-800"
                      : aircraft.status === "MAINTENANCE"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {aircraft.status === "AVAILABLE"
                    ? "Disponible"
                    : aircraft.status === "MAINTENANCE"
                    ? "En maintenance"
                    : "Indisponible"}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {aircraft.registration}
                  </h3>
                  <p className="text-slate-600">{aircraft.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900">
                    {aircraft.hourlyRate} €/h
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    aircraft.hoursBeforeMaintenance <= 5
                      ? "bg-red-50 text-red-800"
                      : aircraft.hoursBeforeMaintenance <= 10
                      ? "bg-amber-50 text-amber-800"
                      : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Wrench className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {aircraft.hoursBeforeMaintenance <= 5
                        ? "Maintenance urgente"
                        : aircraft.hoursBeforeMaintenance <= 10
                        ? "Maintenance à prévoir"
                        : "Maintenance OK"}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {aircraft.hoursBeforeMaintenance}h restantes
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <div className="flex gap-2">
                  {canAccessMaintenance && (
                    <button
                      onClick={() => navigate(`/aircraft/${aircraft.id}/maintenance`)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Wrench className="h-4 w-4" />
                      <span>Maintenance</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAircraft(aircraft)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Remarques</span>
                  </button>
                </div>
                {canEdit && (
                  <button
                    onClick={() => {
                      setSelectedAircraft(aircraft);
                      setIsEditing(true);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                  >
                    Modifier
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredAircraft.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-600">
              Aucun appareil ne correspond aux critères de recherche
            </p>
          </div>
        )}
      </div>

      {selectedAircraft && !isEditing && (
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

      {isEditing && selectedAircraft && (
        <EditAircraftModal
          aircraft={selectedAircraft}
          onClose={() => setIsEditing(false)}
          onSuccess={async () => {
            setIsEditing(false);
            await loadAircraft();
          }}
        />
      )}
    </div>
  );
};

export default AircraftList;