import { supabase } from '../supabase';

interface CalendarEvent {
  calendar: string;
  title: string;
  start: string;
  end: string;
  description?: string;
}

export interface InstructorCalendar {
  id: string;
  instructor_id: string;
  calendar_id: string;
  calendar_name: string;
}

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars';
const GOOGLE_CALENDAR_API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;

export const fetchCalendarEvents = async (calendarId: string, timeMin: string, timeMax: string): Promise<CalendarEvent[]> => {
  try {
    if (!GOOGLE_CALENDAR_API_KEY) {
      throw new Error('Clé API Google Calendar non configurée');
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/${encodeURIComponent(calendarId)}/events?` +
      `key=${GOOGLE_CALENDAR_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`
    );

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des événements: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.items || []).map((event: any) => ({
      calendar: calendarId,
      title: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      description: event.description
    }));
  } catch (error) {
    console.error(`Erreur pour le calendrier ${calendarId}:`, error);
    return [];
  }
};

export const syncInstructorCalendars = async (instructorId: string): Promise<void> => {
  try {
    console.log(`[Sync] Début de la synchronisation pour l'instructeur ${instructorId}`);

    // Récupérer le club_id de l'instructeur via club_members
    console.log(`[Sync] Récupération du club de l'instructeur...`);
    const { data: memberData, error: memberError } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', instructorId)
      .eq('status', 'ACTIVE')
      .single();

    if (memberError) {
      console.error(`[Sync] Erreur lors de la récupération du club:`, memberError);
      throw memberError;
    }
    if (!memberData?.club_id) {
      console.error(`[Sync] L'instructeur n'est associé à aucun club actif`);
      throw new Error("L'instructeur n'est associé à aucun club actif");
    }
    console.log(`[Sync] Club trouvé: ${memberData.club_id}`);

    // Supprimer d'abord les anciennes indisponibilités Google Calendar
    console.log(`[Sync] Suppression des anciennes indisponibilités Google Calendar...`);
    const { error: deleteError } = await supabase
      .from('availabilities')
      .delete()
      .eq('user_id', instructorId)
      .eq('club_id', memberData.club_id)
      .like('reason', '[Google Calendar]%');

    if (deleteError) {
      console.error(`[Sync] Erreur lors de la suppression:`, deleteError);
      throw deleteError;
    }
    console.log(`[Sync] Anciennes indisponibilités supprimées`);

    // Récupérer les calendriers de l'instructeur
    console.log(`[Sync] Récupération des calendriers configurés...`);
    const { data: calendars, error: calendarError } = await supabase
      .from('instructor_calendars')
      .select('*')
      .eq('instructor_id', instructorId);

    if (calendarError) {
      console.error(`[Sync] Erreur lors de la récupération des calendriers:`, calendarError);
      throw calendarError;
    }
    console.log(`[Sync] ${calendars?.length || 0} calendriers trouvés`);

    // Définir la période de synchronisation (à partir de maintenant jusqu'à 3 mois)
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`[Sync] Période de synchronisation: ${timeMin} à ${timeMax}`);

    // Récupérer les événements de tous les calendriers
    console.log(`[Sync] Récupération des événements...`);
    const allEvents = await Promise.all(
      (calendars || []).map(async calendar => {
        console.log(`[Sync] Récupération des événements du calendrier ${calendar.calendar_id}...`);
        const events = await fetchCalendarEvents(calendar.calendar_id, timeMin, timeMax);
        console.log(`[Sync] ${events.length} événements trouvés pour le calendrier ${calendar.calendar_id}`);
        return events;
      })
    );

    // Aplatir le tableau d'événements et ne garder que les événements futurs
    const events = allEvents.flat().filter(event => new Date(event.end) > now);
    console.log(`[Sync] Total des événements futurs trouvés: ${events.length}`);

    if (events.length === 0) {
      console.log(`[Sync] Aucun événement futur à synchroniser, fin du processus`);
      return;
    }

    // Fonction pour fusionner les indisponibilités qui se chevauchent
    const mergeOverlappingUnavailabilities = (availabilities: any[]) => {
      if (availabilities.length === 0) return [];
      
      // Trier les indisponibilités par date de début
      const sorted = [...availabilities].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      
      const merged = [sorted[0]];
      
      for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const last = merged[merged.length - 1];
        
        // Si les périodes se chevauchent
        if (new Date(current.start_time) <= new Date(last.end_time)) {
          // Fusionner les périodes
          last.end_time = new Date(Math.max(
            new Date(last.end_time).getTime(),
            new Date(current.end_time).getTime()
          ));
          // Concaténer les raisons si elles sont différentes
          if (current.reason !== last.reason) {
            last.reason = `${last.reason} + ${current.reason}`;
          }
        } else {
          merged.push(current);
        }
      }
      
      return merged;
    };

    // Convertir les événements en indisponibilités
    const availabilities = events.map(event => ({
      user_id: instructorId,
      start_time: new Date(event.start),
      end_time: new Date(event.end),
      slot_type: 'unavailability',
      is_recurring: false,
      reason: `[Google Calendar] ${event.title}${event.description ? ` - ${event.description}` : ''}`,
      club_id: memberData.club_id
    }));

    // Fusionner les indisponibilités qui se chevauchent
    const mergedAvailabilities = mergeOverlappingUnavailabilities(availabilities);
    console.log(`[Sync] ${availabilities.length} indisponibilités réduites à ${mergedAvailabilities.length} après fusion des chevauchements`);

    // Mettre à jour les disponibilités dans la base de données
    console.log(`[Sync] Insertion des nouvelles indisponibilités par lots...`);
    
    // Insérer par lots de 50
    const batchSize = 50;
    for (let i = 0; i < mergedAvailabilities.length; i += batchSize) {
      console.log(`[Sync] Insertion du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(mergedAvailabilities.length / batchSize)}...`);
      const batch = mergedAvailabilities.slice(i, i + batchSize);
      const { error: batchError } = await supabase
        .from('availabilities')
        .insert(batch);

      if (batchError) {
        console.error(`[Sync] Erreur lors de l'insertion du lot:`, batchError);
        throw batchError;
      }
    }

    console.log(`[Sync] ${mergedAvailabilities.length} nouvelles indisponibilités insérées avec succès`);

  } catch (error) {
    console.error('[Sync] Erreur lors de la synchronisation des calendriers:', error);
    throw error;
  }
};

export const setupCalendarSync = async () => {
  try {
    // Récupérer tous les instructeurs
    const { data: instructors, error: instructorsError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['INSTRUCTOR']);

    if (instructorsError) throw instructorsError;

    // Synchroniser les calendriers de chaque instructeur
    await Promise.all(
      (instructors || []).map(instructor => syncInstructorCalendars(instructor.id))
    );
  } catch (error) {
    console.error('Erreur lors de la configuration de la synchronisation:', error);
    throw error;
  }
};
