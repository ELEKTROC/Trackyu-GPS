/**
 * Helpers partagés pour la création de tickets
 * (extraits de CreateTicketScreen pour pouvoir être testés unitairement)
 */

export function generateSubjectAndDesc(
  category: string,
  subCategory: string,
  plate: string
): { subject: string; description: string } {
  const sub = subCategory || category;
  const subject = plate ? `${sub} - ${plate}` : sub;
  let description = '';
  if (category === 'Réclamation' || category === 'Réclamation client') {
    description = `Réclamation client concernant: ${sub}${plate ? ` - Véhicule: ${plate}` : ''}.`;
  } else if (category === 'Support technique' || category === 'Support et assistance') {
    description = `Support technique requis: ${sub}${plate ? ` - Véhicule concerné: ${plate}` : ''}.`;
  } else {
    description = `${sub}${plate ? ` - Véhicule: ${plate}` : ''}.`;
  }
  return { subject, description };
}

/** Validation date YYYY-MM-DD — vérifie aussi que les composants (jour, mois) sont cohérents */
export function isValidDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const [year, month, day] = d.split('-').map(Number);
  // new Date(year, month-1, day) normalise les débordements → on compare les composants
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

/** Validation heure HH:MM */
export function isValidTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t) && parseInt(t.slice(0, 2)) < 24 && parseInt(t.slice(3)) < 60;
}

/** Convertit date + heure en ISO 8601 */
export function toISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}
