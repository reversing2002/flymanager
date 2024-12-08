// Créons d'abord un fichier utilitaire pour la gestion des dates
export const dateUtils = {
  // Convertit une date UTC en date locale pour l'affichage
  toLocalDateTime: (utcDate: string | null): string => {
    if (!utcDate) return "";
    const date = new Date(utcDate);
    // Ajuste le format pour l'input datetime-local (YYYY-MM-DDThh:mm)
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  },

  // Convertit une date locale en UTC pour la BD
  toUTCDateTime: (localDate: string): string => {
    const date = new Date(localDate);
    return date.toISOString();
  },

  // Formatte une date pour l'affichage
  formatDateTime: (dateString: string): string => {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(new Date(dateString));
  },

  // Formatte une date sans l'heure pour les cotisations
  formatDate: (dateString: string): string => {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeZone: "Europe/Paris",
    }).format(new Date(dateString));
  },
};
