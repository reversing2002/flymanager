import { supabase } from "../lib/supabase";

interface AeroClub {
  latitude: number;
  longitude: number;
  location: string;
  clubName: string;
  postalAddress: string;
  phone: string;
  website: string;
}

async function parseCSV(file: File): Promise<AeroClub[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const clubs: AeroClub[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const [latitude, longitude, location, clubName, postalAddress, phone, website] = line.split(';');
          clubs.push({
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            location: location?.trim() || '',
            clubName: clubName?.trim() || '',
            postalAddress: postalAddress?.trim() || '',
            phone: phone?.trim() || '',
            website: website?.trim() || ''
          });
        }

        resolve(clubs);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function importAeroClubs(file: File, accessToken: string, limit: number = 600) {
  try {
    const clubs = await parseCSV(file);

    // Envoyer les clubs au serveur Node.js
    const response = await fetch('https://stripe.linked.fr/api/admin/import-clubs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        clubs: clubs.slice(0, limit)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'import des clubs');
    }

    const results = await response.json();
    return {
      importedCount: results.success.length,
      errorCount: results.errors.length,
      limitReached: results.success.length + results.errors.length >= limit,
      details: results
    };
  } catch (error) {
    console.error('Erreur lors du parsing du fichier:', error);
    throw error;
  }
}

async function removeAutoImportedClubs(accessToken: string) {
  try {
    // Récupérer tous les clubs auto-importés
    const { data: autoImportedClubs, error: fetchError } = await supabase
      .from('clubs')
      .select('id, user_id')
      .eq('auto_imported', true);

    if (fetchError) throw fetchError;

    for (const club of autoImportedClubs || []) {
      // Supprimer les pages publiques
      await supabase
        .from('public_pages')
        .delete()
        .eq('club_id', club.user_id);

      // Supprimer les données liées au club (vols, instructeurs, etc.)
      await supabase
        .from('flights')
        .delete()
        .eq('club_id', club.id);

      await supabase
        .from('instructors')
        .delete()
        .eq('club_id', club.id);

      await supabase
        .from('aircrafts')
        .delete()
        .eq('club_id', club.id);

      // Supprimer le club
      await supabase
        .from('clubs')
        .delete()
        .eq('id', club.id);

      // Supprimer l'utilisateur via l'API admin
      await fetch(`https://stripe.linked.fr/api/admin/users/${club.user_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }

    return { deletedCount: autoImportedClubs?.length || 0 };
  } catch (error) {
    console.error('Erreur lors de la suppression des clubs auto-importés:', error);
    throw error;
  }
}

export { importAeroClubs, removeAutoImportedClubs };
