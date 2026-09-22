import { getDictionary } from "@/dictionaries";
import { locales } from "@/lib/i18n";
import NotFoundView from "@/components/not-found-view";

/**
 * not-found.tsx ne reçoit pas les params. Plutôt que de lire les en-têtes (ce qui
 * rendrait tout le site dynamique), on passe les quatre traductions — trois lignes
 * chacune — et le composant client choisit d'après l'URL.
 */
export default async function NotFound() {
  const copies = Object.fromEntries(await Promise.all(locales.map(async (l) => [l, (await getDictionary(l)).notFound] as const)));
  return <NotFoundView copies={copies} />;
}
