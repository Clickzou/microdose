# bien-microdose.com

Refonte du site BIEN Microdose (ex-WordPress / WooCommerce / Elementor), septembre 2026.
Next.js 16 · Tailwind 4 · Supabase · CardGate · Vercel. Quatre langues : en, fr, de, nl.

## Démarrer

```bash
npm install
cp .env.local.example .env.local   # puis remplir
npm run dev
```

## Architecture

| Élément | Où | Remarque |
|---|---|---|
| Pages | `src/app/[lang]/` | tout est préfixé par la langue ; `/` redirige vers `/en` (version originale, demande de la cliente du 05/10/2026) |
| Textes d'interface | `src/dictionaries/{en,fr,de,nl}.ts` | `en.ts` fait référence, les autres sont typés dessus |
| Articles, pages légales | `src/content/blog/*.json`, `src/content/legal/*.json` | quadrilingues, versionnés dans Git |
| Catalogue, prix, livraison | `src/lib/catalog.ts` | source unique, le serveur recalcule tout |
| Paiement | `src/lib/cardgate.ts`, `src/app/api/checkout`, `src/app/api/cardgate/callback` | reproduit le plugin officiel CardGate de l'ancien site |
| Base | `supabase/migrations/` | RLS sans politique : seul le serveur accède aux données |
| Anciennes URL | `next.config.ts` → `redirects()` | 301 depuis l'inventaire de l'audit |

### Parcours de commande

1. Panier dans le navigateur (identifiants + quantités uniquement).
2. `POST /api/checkout` : validation, recalcul des prix, enregistrement de la commande avec la
   **preuve de consentement** (18+, déclaration légale, horodatage, IP, navigateur, version des CGV),
   puis création du paiement CardGate et redirection.
3. CardGate appelle `/api/cardgate/callback` (hash MD5 vérifié, montant contrôlé) : c'est la seule
   source de vérité du statut « payé ».
4. Retour client sur `/{lang}/order/{jeton}` : le statut affiché vient de la base.

### Conformité (audit du 18/09/2026)

- Contrôle d'âge à l'entrée + case obligatoire à la commande, conservée.
- Aucune allégation thérapeutique : voir `docs/brief-contenu-agents.md` avant d'écrire un texte.
- Les articles `compliance.status: "review"` ne sortent pas en production tant qu'un juriste ne
  les a pas validés (`PUBLISH_REVIEW_ARTICLES`). Leurs anciennes URL renvoient vers `/learn`.

## Mise en ligne

1. **Supabase** : créer un projet dédié en région UE (Francfort), exécuter
   `supabase/migrations/20260922000000_init.sql` dans l'éditeur SQL.
2. **Vercel** : importer le dépôt GitHub, région des fonctions `fra1`, saisir les variables de
   `.env.local.example`.
3. **CardGate** : dans le back-office, URL de callback = `https://bien-microdose.com/api/cardgate/callback`.
   Tester en mode test avant `CARDGATE_TEST_MODE=false`.
4. **DNS** : pointer bien-microdose.com vers Vercel, puis Search Console → soumettre `/sitemap.xml`.
