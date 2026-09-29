-- BIEN Microdose — code promo sur les commandes (29/09/2026)
--
-- SHROOM10 (−10 %, une utilisation par adresse e-mail) est repris de l'ancienne
-- boutique. Le code et le montant déduit sont conservés avec la commande : ils
-- servent au contrôle « une seule fois par client » et à la lecture des ventes.
-- À exécuter AVANT de déployer le code qui écrit ces colonnes.

alter table orders
  add column if not exists coupon_code text,
  add column if not exists coupon_cents integer not null default 0 check (coupon_cents >= 0);

-- L'API enregistre toujours l'e-mail en minuscules : l'index porte sur la colonne brute.
create index if not exists orders_coupon_idx on orders (coupon_code, email) where coupon_code is not null;
