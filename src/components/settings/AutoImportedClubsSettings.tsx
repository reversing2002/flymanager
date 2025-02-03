import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AutoImportedClub {
  id: string;
  name: string;
  code: string;
  auto_imported: boolean;
  import_date: string;
  settings: {
    website?: string;
    location?: string;
  };
}

export default function AutoImportedClubsSettings() {
  const supabase = useSupabaseClient<Database>();
  const [clubs, setClubs] = useState<AutoImportedClub[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, code, auto_imported, import_date, settings')
        .eq('auto_imported', true)
        .order('import_date', { ascending: false });

      if (error) throw error;
      setClubs(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des clubs:', error);
      toast.error('Erreur lors de la récupération des clubs');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllClubs = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('delete_auto_imported_clubs');
      
      if (error) throw error;
      
      toast.success('Tous les clubs auto-importés ont été supprimés');
      await fetchClubs();
    } catch (error) {
      console.error('Erreur lors de la suppression des clubs:', error);
      toast.error('Erreur lors de la suppression des clubs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Clubs auto-importés</CardTitle>
        {clubs.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (window.confirm(
                'ATTENTION : Cette action va supprimer définitivement tous les clubs auto-importés ainsi que toutes leurs données associées :\n\n' +
                '- Utilisateurs rattachés uniquement à ces clubs\n' +
                '- Vols et réservations\n' +
                '- Membres et leurs accès\n' +
                '- Données comptables\n' +
                '- Modules de formation\n' +
                '- Documents et communications\n' +
                '- Configurations et paramètres\n\n' +
                'Note : Les utilisateurs qui sont membres d\'autres clubs ne seront pas supprimés.\n\n' +
                'Êtes-vous sûr de vouloir continuer ?'
              )) {
                deleteAllClubs();
              }
            }}
            disabled={loading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer tous les clubs
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Chargement...</div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Aucun club auto-importé
          </div>
        ) : (
          <div className="space-y-4">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-semibold">{club.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Code: {club.code} • Importé le {formatDate(club.import_date)}
                  </p>
                  {club.settings?.location && (
                    <p className="text-sm text-muted-foreground">
                      Localisation: {club.settings.location}
                    </p>
                  )}
                  {club.settings?.website && (
                    <p className="text-sm text-muted-foreground">
                      Site web: <a href={club.settings.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{club.settings.website}</a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
