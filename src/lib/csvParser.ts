import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

// Fonction utilitaire pour parser les dates
function parseDate(dateStr: string): string | null {
  try {
    const date = parse(dateStr, 'dd-MM-yyyy', new Date());
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    return null;
  }
}

// Fonction utilitaire pour mapper les types de vol vers leurs IDs
async function getFlightTypeId(typeStr: string): Promise<string> {
  const typeMap = {
    'Navigation': 'navigation',
    'Instruction': 'instruction',
    'Local': 'local',
    'Montagne': 'mountain',
    'Voltige': 'voltige',
    'Initiation': 'initiation',
    'Vol découverte': 'discovery',
    'BIA': 'bia',
    'Convoyage': 'ferry'
  };

  const normalizedType = Object.entries(typeMap).find(([key]) => 
    typeStr.toLowerCase().includes(key.toLowerCase())
  );

  return normalizedType ? normalizedType[1] : 'local';
}

export interface FlightPreview {
  date: string;
  pilotName: string;
  aircraft: string;
  flightType: string;
  instructor?: string;
  duration: string;
  cost: number;
  rawData: any;
}

export async function parseFlightsPreview(csvContent: string): Promise<FlightPreview[]> {
  const lines = csvContent.split('\n');
  const previews: FlightPreview[] = [];
  const errors: string[] = [];

  // Get users and aircraft for mapping
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name');

  const { data: aircraft } = await supabase
    .from('aircraft')
    .select('id, registration');

  const { data: flightTypes } = await supabase
    .from('flight_types')
    .select('id, name');

  // Skip header and process first 10 lines
  for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
    try {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(';');
      if (columns.length < 3) continue;

      const lastName = columns[1]?.trim();
      const firstName = columns[2]?.trim();
      const pilotName = `${firstName} ${lastName}`;
      
      // Find user by name
      const user = users?.find(u => 
        u.last_name.toLowerCase() === lastName.toLowerCase() &&
        u.first_name.toLowerCase() === firstName.toLowerCase()
      );

      // Find aircraft
      const aircraftReg = columns[4]?.trim();
      const plane = aircraft?.find(a => a.registration === aircraftReg);

      // Find instructor if present
      let instructorName = null;
      if (columns[6]) {
        const instructor = users?.find(u => 
          u.last_name.toLowerCase() === columns[6]?.trim().toLowerCase()
        );
        if (instructor) {
          instructorName = `${instructor.first_name} ${instructor.last_name}`;
        }
      }

      // Parse duration (format: HH:mm:ss)
      const duration = columns[7];

      // Parse flight type
      const flightTypeStr = columns[5]?.trim();
      const flightTypeId = await getFlightTypeId(flightTypeStr);
      const flightType = flightTypes?.find(t => t.id === flightTypeId);

      const preview: FlightPreview = {
        date: parseDate(columns[3]) || '',
        pilotName,
        aircraft: aircraftReg,
        flightType: flightType?.name || flightTypeStr,
        instructor: instructorName,
        duration,
        cost: parseFloat(columns[9].replace(',', '.')),
        rawData: {
          userId: user?.id,
          aircraftId: plane?.id,
          flightTypeId,
          date: parseDate(columns[3]),
          duration: duration.split(':').reduce((acc, time) => (60 * acc) + +time, 0),
          cost: parseFloat(columns[9].replace(',', '.')),
          hourlyRate: parseFloat(columns[8]),
          paymentMethod: columns[10].toLowerCase() === 'compte' ? 'ACCOUNT' :
                        columns[10].toLowerCase() === 'espèce' ? 'CASH' :
                        columns[10].toLowerCase() === 'carte' ? 'CARD' : 'TRANSFER',
        }
      };

      previews.push(preview);
    } catch (error) {
      errors.push(`Ligne ${i + 1}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return previews;
}

export async function importFlights(flights: FlightPreview[]): Promise<void> {
  for (const flight of flights) {
    const { rawData } = flight;
    
    try {
      const reservationId = uuidv4();
      
      // Créer la réservation
      await createReservation({
        id: reservationId,
        userId: rawData.userId,
        aircraftId: rawData.aircraftId,
        flightTypeId: rawData.flightTypeId,
        startTime: `${rawData.date}T00:00:00`,
        endTime: `${rawData.date}T23:59:59`,
        status: 'COMPLETED'
      });

      // Créer le vol
      await supabase
        .from('flights')
        .insert({
          id: uuidv4(),
          reservationId,
          ...rawData
        });

    } catch (error) {
      console.error('Error importing flight:', error);
      throw error;
    }
  }
}

async function createReservation(data: any): Promise<void> {
  const { error } = await supabase
    .from('reservations')
    .insert(data);

  if (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }
}