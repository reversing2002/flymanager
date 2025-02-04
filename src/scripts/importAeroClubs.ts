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

async function importAeroClubsBatch(clubs: AeroClub[], accessToken: string, startIndex: number, batchSize: number) {
  const batchClubs = clubs.slice(startIndex, startIndex + batchSize);
  
  const response = await fetch('https://stripe.linked.fr/api/admin/import-clubs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ clubs: batchClubs })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de l\'import des clubs');
  }

  return await response.json();
}

async function importAeroClubs(file: File, accessToken: string, limit: number = 600) {
  try {
    const clubs = await parseCSV(file);
    const batchSize = 10;
    const totalBatches = Math.min(Math.ceil(limit / batchSize), Math.ceil(clubs.length / batchSize));
    
    let totalSuccess = 0;
    let totalErrors = 0;
    const allResults = {
      success: [] as any[],
      errors: [] as any[]
    };

    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize;
      const results = await importAeroClubsBatch(clubs, accessToken, startIndex, batchSize);
      
      totalSuccess += results.success.length;
      totalErrors += results.errors.length;
      allResults.success.push(...results.success);
      allResults.errors.push(...results.errors);

      // Si on a atteint la limite, on arrête
      if (totalSuccess + totalErrors >= limit) {
        break;
      }
    }

    return {
      importedCount: totalSuccess,
      errorCount: totalErrors,
      limitReached: totalSuccess + totalErrors >= limit,
      details: allResults
    };
  } catch (error) {
    console.error('Erreur lors du traitement des clubs:', error);
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
