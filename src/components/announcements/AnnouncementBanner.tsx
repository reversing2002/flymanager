import React from "react";
import { Bell, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import type { Announcement } from "../../types/database";

interface AnnouncementBannerProps {
  announcement: Announcement;
  onDismiss?: (id: string) => void;
}

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcement,
  onDismiss,
}) => {
  const { user } = useAuth();

  const handleDismiss = async () => {
    if (!user) return;

    try {
      // Sauvegarder en base de données
      const { error } = await supabase.from("dismissed_announcements").insert([
        {
          user_id: user.id,
          announcement_id: announcement.id,
        },
      ]);

      if (error) throw error;

      // Appeler le callback parent
      if (onDismiss) {
        onDismiss(announcement.id);
      }
    } catch (err) {
      console.error("Erreur lors du masquage de l'annonce:", err);
      toast.error("Erreur lors du masquage de l'annonce");
    }
  };

  const getPriorityStyles = (priority: "LOW" | "MEDIUM" | "HIGH") => {
    switch (priority) {
      case "HIGH":
        return "bg-red-50 text-red-800 border-red-100";
      case "MEDIUM":
        return "bg-amber-50 text-amber-800 border-amber-100";
      default:
        return "bg-sky-50 text-sky-800 border-sky-100";
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border ${getPriorityStyles(
        announcement.priority
      )} animate-fade-in`}
    >
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="font-medium">{announcement.title}</div>
          <p className="text-sm">{announcement.content}</p>
          <div className="text-xs opacity-75">
            {format(new Date(announcement.created_at), "PPP", { locale: fr })}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/50 rounded-lg transition-colors"
            title="Masquer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AnnouncementBanner;
