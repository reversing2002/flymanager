type TimeFormat = "DECIMAL" | "CLASSIC";

/**
 * Convertit un nombre d'heures décimal en format classique (heures et minutes)
 * @param decimalHours - Nombre d'heures en format décimal (ex: 1.5)
 * @returns Format classique (ex: "1h30")
 */
export const decimalToClassicTime = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}h${minutes.toString().padStart(2, '0')}`;
};

/**
 * Convertit un temps en format classique en nombre d'heures décimal
 * @param classicTime - Temps en format classique (ex: "1h30" ou "1:30")
 * @returns Nombre d'heures en format décimal (ex: 1.5)
 */
export const classicToDecimalTime = (classicTime: string): number => {
  // Supporte les formats "1h30" et "1:30"
  const match = classicTime.match(/^(\d+)[h:](\d+)$/);
  if (!match) return 0;

  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  return hours + (minutes / 60);
};

/**
 * Formate un nombre d'heures selon le format spécifié
 * @param hours - Nombre d'heures en format décimal
 * @param format - Format souhaité ("DECIMAL" ou "CLASSIC")
 * @returns Temps formaté selon le format spécifié
 */
export const formatTime = (hours: number, format: TimeFormat): string => {
  if (format === "DECIMAL") {
    return hours.toFixed(2) + "h";
  }
  return decimalToClassicTime(hours);
};

/**
 * Parse une chaîne de temps dans n'importe quel format et retourne un nombre décimal
 * @param timeString - Temps en format quelconque (ex: "1.5", "1h30", "1:30")
 * @returns Nombre d'heures en format décimal
 */
export const parseTime = (timeString: string): number => {
  // Si c'est déjà un nombre
  if (!isNaN(Number(timeString))) {
    return Number(timeString);
  }

  // Si c'est au format classique
  if (timeString.includes('h') || timeString.includes(':')) {
    return classicToDecimalTime(timeString);
  }

  return 0;
};

/**
 * Convertit des minutes en format horaire selon le format spécifié
 * @param minutes - Nombre de minutes
 * @param format - Format souhaité ("DECIMAL" ou "CLASSIC")
 * @returns Temps formaté selon le format spécifié
 */
export const minutesToTimeFormat = (minutes: number, format: TimeFormat): string => {
  const decimalHours = minutes / 60;
  return formatTime(decimalHours, format);
};
