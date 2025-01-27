// Raccourcit un UUID en ne gardant que les 8 premiers caractères
export function shortenUuid(uuid: string): string {
  return uuid.split('-')[0];
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères spéciaux par des tirets
    .replace(/^-+|-+$/g, '') // Supprime les tirets au début et à la fin
    .slice(0, 100); // Limite la longueur du slug
}
