-- BIEN Microdose — schéma initial (22/09/2026)
--
-- Principe de sécurité : RLS activée sur toutes les tables, AUCUNE politique.
-- Les rôles anon et authenticated n'ont donc accès à rien ; seules les routes API
-- du site, qui utilisent la clé de service (bypass RLS), lisent et écrivent.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Commandes
-- ---------------------------------------------------------------------------
create sequence if not exists order_number_seq start 30001;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  -- Numéro lisible, envoyé à CardGate comme référence. Démarre au-dessus du
  -- dernier numéro WooCommerce (22061) pour ne jamais créer de doublon.
  number bigint not null unique default nextval('order_number_seq'),
  -- Jeton opaque des URL de retour : la page de statut ne s'ouvre pas avec le seul
  -- numéro de commande, qui est devinable.
  public_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'failed', 'cancelled', 'shipped', 'refunded')),
  lang text not null check (lang in ('en', 'fr', 'de', 'nl')),

  email text not null,
  phone text,
  first_name text not null,
  last_name text not null,
  address1 text not null,
  address2 text,
  zip text not null,
  city text not null,
  country text not null,

  items jsonb not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'EUR',

  -- Preuve du consentement (audit, point bloquant n° 2) : horodatage, IP et
  -- navigateur au moment où la case 18+ et la déclaration légale ont été cochées.
  age_confirmed_at timestamptz,
  legal_confirmed_at timestamptz,
  consent_ip inet,
  consent_user_agent text,
  terms_version text,

  newsletter_opt_in boolean not null default false,

  payment_provider text not null default 'cardgate',
  payment_transaction text,
  payment_code integer,
  paid_at timestamptz
);

create index if not exists orders_email_idx on orders (lower(email));
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);

create table if not exists payment_events (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  order_id uuid references orders (id) on delete set null,
  transaction text,
  code integer,
  valid_hash boolean not null,
  payload jsonb not null
);

create or replace function touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_touch on orders;
create trigger orders_touch before update on orders
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Formulaires
-- ---------------------------------------------------------------------------
create table if not exists contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lang text not null,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  ip inet,
  handled boolean not null default false
);

create table if not exists newsletter_subscribers (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- Toujours enregistré en minuscules par l'API ; contrainte simple (et non sur
  -- lower(email)) pour que l'upsert « on conflict (email) » puisse s'en servir.
  email text not null unique check (email = lower(email)),
  lang text not null,
  source text not null default 'site',
  unsubscribed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Verrouillage
-- ---------------------------------------------------------------------------
alter table orders enable row level security;
alter table payment_events enable row level security;
alter table contact_messages enable row level security;
alter table newsletter_subscribers enable row level security;

revoke all on orders, payment_events, contact_messages, newsletter_subscribers from anon, authenticated;
revoke all on sequence order_number_seq from anon, authenticated;
