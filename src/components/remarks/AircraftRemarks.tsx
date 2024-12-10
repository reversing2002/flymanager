import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { AircraftRemark } from "../../types/database";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

const statusIcons = {
  PENDING: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  IN_PROGRESS: <Clock className="w-5 h-5 text-blue-500" />,
  RESOLVED: <CheckCircle className="w-5 h-5 text-emerald-500" />,
};

const statusLabels = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
};

const statusColors = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/10",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-600/10",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
};

interface Props {
  limit?: number;
  className?: string;
}

export default function AircraftRemarks({ limit = 5, className }: Props) {
  const [remarks, setRemarks] = useState<AircraftRemark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRemarks = async () => {
      const { data, error } = await supabase
        .from("aircraft_remarks")
        .select(`
          *,
          user:user_id (
            first_name,
            last_name
          ),
          aircraft:aircraft_id (
            registration
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching remarks:", error);
      } else {
        setRemarks(data || []);
      }
      setLoading(false);
    };

    fetchRemarks();
  }, [limit]);

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-20 bg-slate-200 rounded-lg"></div>
        <div className="h-20 bg-slate-200 rounded-lg"></div>
        <div className="h-20 bg-slate-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {remarks.map((remark) => (
        <div
          key={remark.id}
          className="bg-white rounded-lg p-4 shadow-sm border border-slate-100"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">
                  {remark.aircraft?.registration}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    statusColors[remark.status]
                  }`}
                >
                  {statusIcons[remark.status]}
                  <span className="ml-1">{statusLabels[remark.status]}</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{remark.content}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span>{remark.user?.first_name} {remark.user?.last_name}</span>
                <span>•</span>
                <span>
                  {new Date(remark.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
