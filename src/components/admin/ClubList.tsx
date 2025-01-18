import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Club {
  id: string;
  name: string;
  code: string;
  member_count: number;
  aircraft_count: number;
}

export default function ClubList() {
  const [clubToDelete, setClubToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_clubs_stats');

      if (error) throw error;
      return data as Club[];
    },
  });

  const handleDeleteClub = async (clubId: string) => {
    try {
      const { error } = await supabase.rpc('delete_club_and_related_data', {
        input_club_id: clubId,
      });

      if (error) throw error;

      toast.success('Club supprimé avec succès');
      queryClient.invalidateQueries(['clubs-stats']);
      setClubToDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression du club:', error);
      toast.error('Erreur lors de la suppression du club');
    }
  };

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Liste des clubs</h2>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Membres</TableHead>
              <TableHead className="text-right">Avions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clubs.map((club) => (
              <TableRow key={club.id}>
                <TableCell>{club.name}</TableCell>
                <TableCell>{club.code}</TableCell>
                <TableCell className="text-right">{club.member_count}</TableCell>
                <TableCell className="text-right">{club.aircraft_count}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setClubToDelete(club.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!clubToDelete} onOpenChange={() => setClubToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce club ? Cette action est irréversible
              et supprimera toutes les données associées (membres, avions, vols, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => clubToDelete && handleDeleteClub(clubToDelete)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
