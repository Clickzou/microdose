/**
 * Traduction des libellés bruts renvoyés par Google en langage lisible.
 *
 * Analytics et Search Console parlent en chemins d'URL (`/fr/product/peace-in-the-chaos`),
 * en codes pays ISO (`fra`) et en noms de canaux anglais (`Organic Search`).
 * Un tableau de bord destiné au client doit afficher « Produit — Peace in the chaos »,
 * « France » et « Recherche naturelle » : le chemin technique reste affiché en
 * dessous, en petit, pour qui veut vérifier l'URL exacte.
 */

/* ------------------------------------------------------------------ pages */

/** Sections du site, telles qu'elles apparaissent dans l'URL (identiques dans les
 *  quatre langues : seul le préfixe change). */
const SECTIONS: Record<string, string> = {
  shop: "Boutique",
  product: "Produit",
  learn: "Comprendre (blog)",
  "how-it-works": "Comment ça marche",
  about: "À propos",
  faq: "Questions fréquentes",
  contact: "Contact",
  cart: "Panier",
  checkout: "Commande",
  order: "Confirmation de commande",
  terms: "Conditions générales de vente",
  privacy: "Confidentialité",
};

const LANGS = ["fr", "en", "de", "nl"] as const;
export type PageLang = "FR" | "EN" | "DE" | "NL";

/** `ashwagandha-bienfaits` devient `Ashwagandha bienfaits`. */
function humanize(slug: string): string {
  let words = slug;
  try {
    words = decodeURIComponent(slug);
  } catch {
    /* chemin mal encodé : on garde la valeur brute */
  }
  words = words.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

export type PageLabel = {
  label: string;
  lang: PageLang | null;
  path: string;
  /** Section et identifiant, quand l'URL en désigne un — sert à retrouver le
   *  vrai titre d'un article (voir `PageCell` dans `ui.tsx`). */
  section?: string;
  slug?: string;
};

/**
 * Nom lisible d'une page à partir de son chemin.
 *
 * Le préfixe de langue est extrait à part : il devient un marqueur FR/EN plutôt
 * qu'un segment d'URL, sans quoi la page d'accueil anglaise s'affiche « /en » et
 * ne se distingue de la française que par deux caractères.
 *
 * Les pages de confirmation (`/fr/order/<jeton>`) sont regroupées sous un seul
 * libellé : le jeton est propre à chaque commande et n'apprend rien.
 */
export function pageLabel(rawPath: string): PageLabel {
  const raw = (rawPath || "").trim();

  // GA4 remonte « (not set) » quand il n'a pas su rattacher la session à une page.
  if (!raw || /^\(.*\)$/.test(raw)) {
    return { label: "Page non identifiée par Analytics", lang: null, path: raw || "—" };
  }

  const path = raw.split("?")[0].split("#")[0] || "/";
  const segments = path.split("/").filter(Boolean);

  let lang: PageLang | null = null;
  if ((LANGS as readonly string[]).includes(segments[0] ?? "")) {
    lang = segments.shift()!.toUpperCase() as PageLang;
  }

  if (!segments.length) return { label: "Accueil", lang, path };

  const [head, ...rest] = segments;
  const section = SECTIONS[head];

  if (!section) return { label: humanize(head), lang, path };
  if (!rest.length || head === "order") return { label: section, lang, path };

  // `product/peace-in-the-chaos` donne « Produit — Peace in the chaos ». Un
  // article de `learn` devient « Article » : plus juste que le nom de la liste.
  const slug = rest.join("/");
  const noun = head === "learn" ? "Article" : section;
  return { label: `${noun} — ${humanize(rest.join(" "))}`, lang, path, section: head, slug };
}

/* ----------------------------------------------------------------- canaux */

/** `sessionDefaultChannelGroup` de GA4, en français. */
const CHANNELS: Record<string, string> = {
  "Organic Search": "Recherche naturelle",
  "Paid Search": "Liens sponsorisés",
  "Organic Social": "Réseaux sociaux",
  "Paid Social": "Publicités sur les réseaux sociaux",
  "Organic Video": "Vidéo (YouTube, etc.)",
  "Paid Video": "Publicité vidéo",
  "Organic Shopping": "Google Shopping (gratuit)",
  "Paid Shopping": "Google Shopping (payant)",
  Direct: "Accès direct",
  Referral: "Sites qui font un lien",
  Email: "E-mailing",
  Affiliates: "Affiliation",
  Display: "Bannières publicitaires",
  "Cross-network": "Campagnes multi-réseaux",
  "Paid Other": "Autre publicité",
  "Mobile Push Notifications": "Notifications mobiles",
  SMS: "SMS",
  Audio: "Audio",
  Unassigned: "Origine inconnue",
};

export function channelLabel(raw: string): string {
  if (!raw) return "Origine inconnue";
  return CHANNELS[raw] ?? raw;
}

/* -------------------------------------------------------------- appareils */

const DEVICES: Record<string, string> = {
  mobile: "Téléphone",
  desktop: "Ordinateur",
  tablet: "Tablette",
  smart_tv: "Téléviseur connecté",
};

export function deviceLabel(raw: string): string {
  const key = (raw || "").toLowerCase().replace(/\s+/g, "_");
  return DEVICES[key] ?? (raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "Inconnu");
}

/* ------------------------------------------------------------------- pays */

/**
 * Search Console renvoie des codes ISO à trois lettres, qu'`Intl.DisplayNames`
 * ne sait pas lire — il attend deux lettres. D'où cette table, limitée aux pays
 * qui apparaissent réellement dans les rapports d'un site francophone ; le reste
 * retombe sur le code en majuscules, qui reste identifiable.
 */
const ISO3_TO_ISO2: Record<string, string> = {
  fra: "FR", bel: "BE", che: "CH", lux: "LU", mco: "MC", can: "CA", usa: "US",
  gbr: "GB", irl: "IE", deu: "DE", esp: "ES", ita: "IT", prt: "PT", nld: "NL",
  aut: "AT", pol: "PL", swe: "SE", nor: "NO", dnk: "DK", fin: "FI", grc: "GR",
  rou: "RO", bgr: "BG", hun: "HU", cze: "CZ", svk: "SK", hrv: "HR", svn: "SI",
  ukr: "UA", rus: "RU", tur: "TR", mar: "MA", dza: "DZ", tun: "TN", egy: "EG",
  sen: "SN", civ: "CI", cmr: "CM", mus: "MU", mdg: "MG", zaf: "ZA", isr: "IL",
  are: "AE", sau: "SA", ind: "IN", chn: "CN", jpn: "JP", kor: "KR", sgp: "SG",
  aus: "AU", nzl: "NZ", bra: "BR", arg: "AR", mex: "MX", chl: "CL", col: "CO",
  reu: "RE", glp: "GP", mtq: "MQ", guf: "GF", ncl: "NC", pyf: "PF", myt: "YT",
};

/** Noms de pays d'Analytics, qui les renvoie en anglais. */
const EN_TO_FR: Record<string, string> = {
  Belgium: "Belgique",
  Switzerland: "Suisse",
  "United States": "États-Unis",
  "United Kingdom": "Royaume-Uni",
  Germany: "Allemagne",
  Spain: "Espagne",
  Italy: "Italie",
  Netherlands: "Pays-Bas",
  Ireland: "Irlande",
  Morocco: "Maroc",
  Algeria: "Algérie",
  Tunisia: "Tunisie",
  Senegal: "Sénégal",
  "Ivory Coast": "Côte d'Ivoire",
  Cameroon: "Cameroun",
  Mauritius: "Maurice",
  Australia: "Australie",
  India: "Inde",
  China: "Chine",
  Japan: "Japon",
  Brazil: "Brésil",
  Mexico: "Mexique",
  Poland: "Pologne",
  Sweden: "Suède",
  Norway: "Norvège",
  Denmark: "Danemark",
  Finland: "Finlande",
  Greece: "Grèce",
  Turkey: "Turquie",
  Russia: "Russie",
  Israel: "Israël",
  "United Arab Emirates": "Émirats arabes unis",
  Singapore: "Singapour",
  "New Zealand": "Nouvelle-Zélande",
  "South Africa": "Afrique du Sud",
  "Czech Republic": "Tchéquie",
  Portugal: "Portugal",
  Canada: "Canada",
  Luxembourg: "Luxembourg",
  France: "France",
};

let regionNames: Intl.DisplayNames | null | undefined;
function regions(): Intl.DisplayNames | null {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  return regionNames;
}

/** Accepte `fra` (Search Console) comme `FR` ou `France` (Analytics). */
export function countryLabel(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "Pays inconnu";
  if (/^\(.*\)$/.test(value)) return "Pays non identifié";

  const iso2 =
    value.length === 3 ? ISO3_TO_ISO2[value.toLowerCase()] : value.length === 2 ? value.toUpperCase() : null;
  if (iso2) return regions()?.of(iso2) ?? iso2;

  return EN_TO_FR[value] ?? value;
}
