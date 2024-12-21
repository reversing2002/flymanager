// Convertit une valeur d'horamètre en minutes
export function hourMeterToMinutes(start: number, end: number, format: 'DECIMAL' | 'CLASSIC' = 'DECIMAL'): number {
  if (format === 'DECIMAL') {
    // Format décimal : la différence est directement en heures (ex: 1.5 - 1.0 = 0.5 heures)
    // Arrondir à la minute près pour éviter les problèmes de précision
    return Math.round((end - start) * 60);
  } else {
    // Format classique : les minutes sont sur base 60 (ex: 1.60 = 2 heures)
    const startHours = Math.floor(start);
    const startMinutes = Math.round((start % 1) * 100);
    const endHours = Math.floor(end);
    const endMinutes = Math.round((end % 1) * 100);

    // Convertir en minutes totales
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    return Math.max(0, endTotalMinutes - startTotalMinutes);
  }
}

// Valide une valeur d'horamètre selon le format
export function validateHourMeter(value: number | string, format: 'DECIMAL' | 'CLASSIC' = 'DECIMAL'): { isValid: boolean; error?: string } {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: "La valeur doit être un nombre valide" };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: "L'horamètre ne peut pas être négatif" };
  }

  if (format === 'DECIMAL') {
    return { isValid: true };
  } else {
    const minutes = Math.round((numValue % 1) * 100);
    if (minutes > 59) {
      return { isValid: false, error: "Les minutes ne peuvent pas dépasser 59" };
    }
    return { isValid: true };
  }
}

// Vérifie que l'horamètre de fin est supérieur à celui de départ
export function validateHourMeterRange(start: number, end: number): { isValid: boolean; error?: string } {
  if (end < start) {
    return { 
      isValid: false, 
      error: "L'horamètre de fin doit être supérieur à l'horamètre de départ" 
    };
  }
  return { isValid: true };
}

// Formate une valeur d'horamètre pour l'affichage
export function formatHourMeter(value: number | null | undefined, format: 'DECIMAL' | 'CLASSIC' = 'DECIMAL'): string {
  if (value === null || value === undefined) return '';
  
  if (format === 'DECIMAL') {
    return value.toFixed(1);
  } else {
    const hours = Math.floor(value);
    const minutes = Math.round((value % 1) * 100);
    return `${hours}.${minutes.toString().padStart(2, '0')}`;
  }
}

// Parse une chaîne en valeur d'horamètre
export function parseHourMeter(value: string, format: 'DECIMAL' | 'CLASSIC' = 'DECIMAL'): number | null {
  if (!value) return null;
  
  const numValue = parseFloat(value.replace(',', '.'));
  if (isNaN(numValue)) return null;
  
  if (format === 'DECIMAL') {
    return numValue;
  } else {
    const hours = Math.floor(numValue);
    const minutes = Math.round((numValue % 1) * 100);
    if (minutes > 59) return null;
    return hours + (minutes / 100);
  }
}

// Récupère le dernier horamètre d'un avion depuis la base de données
export async function getLastHourMeter(supabase: SupabaseClient, aircraftId: string): Promise<number | null> {
  // Récupérer le dernier vol de l'avion
  const { data: lastFlight } = await supabase
    .from('flights')
    .select('end_hour_meter')
    .eq('aircraft_id', aircraftId)
    .order('end_hour_meter', { ascending: false })
    .limit(1)
    .single();

  if (lastFlight?.end_hour_meter) {
    return lastFlight.end_hour_meter;
  }

  // Si aucun vol n'est trouvé, récupérer l'horamètre de base de l'avion
  const { data: aircraft } = await supabase
    .from('aircraft')
    .select('last_hour_meter')
    .eq('id', aircraftId)
    .single();

  return aircraft?.last_hour_meter || 0;
}
