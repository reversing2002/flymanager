import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle, Wrench, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Aircraft } from "../../types/database";
import AircraftRemarks from "./AircraftRemarks";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { getMaintenanceStats, type MaintenanceStats } from "../../lib/queries/aircraft";

interface AircraftCardProps {
  aircraft: Aircraft;
  onView: (aircraft: Aircraft) => void;
  onEdit?: (aircraft: Aircraft) => void;
  canEdit: boolean;
  onReserve: (aircraft: Aircraft) => void;
}

const AircraftCard: React.FC<AircraftCardProps> = ({
  aircraft,
  onView,
  onEdit,
  canEdit,
  onReserve,
}) => {
  const navigate = useNavigate();
  const [showRemarks, setShowRemarks] = useState(false);
  const [maintenanceStats, setMaintenanceStats] = useState<MaintenanceStats | null>(null);
  const { user } = useAuth();
  
  const canAccessMaintenance = hasAnyGroup(user, ['MECHANIC', 'ADMIN']);

  useEffect(() => {
    if (canAccessMaintenance) {
      const loadMaintenanceStats = async () => {
        try {
          const stats = await getMaintenanceStats();
          setMaintenanceStats(stats);
        } catch (error) {
          console.error("Error loading maintenance stats:", error);
        }
      };
      loadMaintenanceStats();
    }
  }, [canAccessMaintenance]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-emerald-100 text-emerald-800";
      case "MAINTENANCE":
        return "bg-amber-100 text-amber-800";
      case "UNAVAILABLE":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Disponible";
      case "MAINTENANCE":
        return "En maintenance";
      case "UNAVAILABLE":
        return "Indisponible";
      default:
        return status;
    }
  };

  const getMaintenanceStatus = () => {
    if (!maintenanceStats) {
      return {
        color: "text-slate-600",
        bgColor: "bg-slate-50",
        icon: <Clock className="h-4 w-4" />,
        label: "Chargement...",
        hours: "",
      };
    }

    const aircraftStats = maintenanceStats.aircraft_stats.find(
      stats => stats.id === aircraft.id
    );

    if (!aircraftStats) {
      return {
        color: "text-slate-600",
        bgColor: "bg-slate-50",
        icon: <Clock className="h-4 w-4" />,
        label: "Données non disponibles",
        hours: "",
      };
    }

    const { maintenance_status, hours_before_maintenance } = aircraftStats;

    switch (maintenance_status) {
      case 'OVERDUE':
        return {
          color: "text-red-600",
          bgColor: "bg-red-50",
          icon: <AlertTriangle className="h-4 w-4" />,
          label: "Maintenance dépassée",
          hours: `${hours_before_maintenance}h restantes`,
        };
      case 'URGENT':
        return {
          color: "text-red-600",
          bgColor: "bg-red-50",
          icon: <AlertTriangle className="h-4 w-4" />,
          label: "Maintenance urgente",
          hours: `${hours_before_maintenance}h restantes`,
        };
      case 'WARNING':
        return {
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          icon: <Clock className="h-4 w-4" />,
          label: "Maintenance à prévoir",
          hours: `${hours_before_maintenance}h restantes`,
        };
      default:
        return {
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          icon: <Wrench className="h-4 w-4" />,
          label: "Maintenance OK",
          hours: `${hours_before_maintenance}h restantes`,
        };
    }
  };

  const maintenanceStatus = getMaintenanceStatus();

  const getAircraftImage = (aircraft: Aircraft) => {
    if (aircraft.imageUrl) {
      return aircraft.imageUrl;
    }

    switch (aircraft.type) {
      case "PLANE":
        return "https://images.unsplash.com/photo-1583396618422-6af71b6fb4b3?auto=format&fit=crop&q=80&w=800&h=400";
      case "ULM":
        return "https://images.unsplash.com/photo-1565155003309-5c86a4d3a388?auto=format&fit=crop&q=80&w=800&h=400";
      case "HELICOPTER":
        return "https://images.unsplash.com/photo-1569629743817-70d8db5c6b9d?auto=format&fit=crop&q=80&w=800&h=400";
      default:
        return "https://images.unsplash.com/photo-1583396618422-6af71b6fb4b3?auto=format&fit=crop&q=80&w=800&h=400";
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div className="relative h-48 w-full">
          <img
            src={getAircraftImage(aircraft)}
            alt={aircraft.registration}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                aircraft.status
              )}`}
            >
              {getStatusLabel(aircraft.status)}
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
              className={`flex items-center justify-between p-3 rounded-lg ${maintenanceStatus.bgColor}`}
            >
              <div className="flex items-center space-x-2">
                {maintenanceStatus.icon}
                <span
                  className={`text-sm font-medium ${maintenanceStatus.color}`}
                >
                  {maintenanceStatus.label}
                </span>
              </div>
              <span className={`text-sm font-medium ${maintenanceStatus.color}`}>
                {maintenanceStatus.hours}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="flex flex-wrap gap-2">
              {canAccessMaintenance && (
                <button
                  onClick={() => navigate(`/aircraft/${aircraft.id}/maintenance`)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors min-w-[120px]"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Maintenance</span>
                </button>
              )}
              <button
                onClick={() => setShowRemarks(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors min-w-[120px]"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Remarques</span>
              </button>
              {canEdit && (
                <button
                  onClick={() => onEdit?.(aircraft)}
                  className="flex-1 sm:flex-none flex items-center justify-center px-2.5 py-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors min-w-[120px]"
                >
                  Modifier
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRemarks && (
        <AircraftRemarks 
          aircraftId={aircraft.id} 
          onClose={() => setShowRemarks(false)} 
        />
      )}
    </>
  );
};

export default AircraftCard;