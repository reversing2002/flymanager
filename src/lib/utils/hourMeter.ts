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
export function validateHourMeter(value: number, format: 'DECIMAL' | 'CLASSIC' = 'DECIMAL'): boolean {
  if (format === 'DECIMAL') {
    // Format décimal : accepte n'importe quel nombre positif
    return value >= 0;
  } else {
    // Format classique : les minutes ne peuvent pas dépasser 59
    const minutes = Math.round((value % 1) * 100);
    return value >= 0 && minutes <= 59;
  }
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
