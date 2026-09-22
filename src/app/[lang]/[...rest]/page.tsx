import { notFound } from "next/navigation";

// Toute URL inconnue sous /{langue}/ affiche la page 404 localisée, en HTTP 404.
export default function CatchAll() {
  notFound();
}
