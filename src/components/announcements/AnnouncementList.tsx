import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, AlertTriangle, Info, Megaphone } from 'lucide-react';
import type { Announcement } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface AnnouncementListProps {
  announcements: Announcement[];
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (id: string) => void;
}

const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  onEdit,
  onDelete,
}) => {
  const handleDelete = async (id: string) => {
    if (!onDelete || !window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      return;
    }

    try {
      // First delete all dismissed_announcements records
      const { error: dismissedError } = await supabase
        .from('dismissed_announcements')
        .delete()
        .eq('announcement_id', id);

      if (dismissedError) throw dismissedError;

      // Then delete the announcement
      const { error: announcementError } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (announcementError) throw announcementError;

      onDelete(id);
      toast.success('Annonce supprimée');
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getPriorityIcon = (priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (priority) {
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'MEDIUM':
        return <Bell className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-sky-500" />;
    }
  };

  const getPriorityLabel = (priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (priority) {
      case 'HIGH':
        return 'Urgent';
      case 'MEDIUM':
        return 'Important';
      default:
        return 'Information';
    }
  };

  return (
    <div className="space-y-4">
      {announcements.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune annonce pour le moment</p>
        </div>
      ) : (
        announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {getPriorityIcon(announcement.priority)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {announcement.title}
                    </h3>
                    <div className="text-xs text-slate-500 mt-1">
                      {format(new Date(announcement.created_at), 'PPP à HH:mm', {
                        locale: fr,
                      })}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    announcement.priority === 'HIGH'
                      ? 'bg-red-100 text-red-800'
                      : announcement.priority === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}>
                    {getPriorityLabel(announcement.priority)}
                  </span>
                </div>
                <p className="mt-2 text-slate-600">{announcement.content}</p>
                {(onEdit || onDelete) && (
                  <div className="mt-4 pt-4 border-t flex justify-end space-x-4">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(announcement)}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900"
                      >
                        Modifier
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AnnouncementList;