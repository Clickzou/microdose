import Link from "next/link";
import Image from "next/image";
import type { Dictionary } from "@/dictionaries/en";
import { products, type ProductSlug } from "@/lib/catalog";
import { formatDate, formatPrice, href, type Locale } from "@/lib/i18n";
import type { Article } from "@/lib/content";

/** Titre en deux temps : grotesque puis italique serif. */
export function Title({
  as: Tag = "h2",
  a,
  b,
  className = "",
}: {
  as?: "h1" | "h2" | "h3";
  a: string;
  b?: string;
  className?: string;
}) {
  return (
    <Tag className={className}>
      {a}
      {b ? (
        <>
          {" "}
          <span className="accent">{b}</span>
        </>
      ) : null}
    </Tag>
  );
}

export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft ${className}`}>{children}</p>;
}

export function ButtonLink({
  href: to,
  children,
  variant = "solid",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "ghost" | "light";
}) {
  const styles = {
    solid: "bg-ink text-paper hover:bg-ink-soft",
    ghost: "border border-ink/20 text-ink hover:border-ink",
    light: "bg-paper text-ink hover:bg-white",
  }[variant];
  return (
    <Link href={to} className={`inline-flex items-center justify-center rounded-full px-7 py-3.5 font-medium transition ${styles}`}>
      {children}
    </Link>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-ink/10 bg-paper py-4" aria-hidden="true">
      <div className="bm-marquee-track flex w-max gap-10 whitespace-nowrap">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-lg font-semibold tracking-tight">
            {item}
            <span className="size-1.5 rounded-full bg-earth" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProductCard({
  lang,
  slug,
  t,
  heading: Heading = "h3",
}: {
  lang: Locale;
  slug: ProductSlug;
  t: Dictionary;
  /** Niveau du titre : h3 sous un H2 de section, h2 quand la page n'en a pas (boutique). */
  heading?: "h2" | "h3";
}) {
  const p = products[slug];
  const copy = t.products[slug];
  return (
    <Link href={href(lang, `/product/${slug}`)} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-coffret-soft">
        <Image
          src={p.images[0]}
          alt={copy.name}
          fill
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="object-cover transition duration-700 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <Heading className="text-2xl">{copy.name}</Heading>
          <p className="mt-1 text-ink-soft">{copy.tagline}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold">{formatPrice(p.priceCents, lang)}</p>
          {p.doses ? (
            <p className="text-sm text-muted">
              {formatPrice(Math.round(p.priceCents / p.doses), lang)} {t.common.perDose}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** Catégorie cliquable, temps de lecture et date de parution — commun aux cartes du blog. */
function ArticleMeta({ lang, article, t }: { lang: Locale; article: Article; t: Dictionary }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
      <Link href={href(lang, `/learn/category/${article.category}`)} className="hover:text-ink hover:underline hover:underline-offset-4">
        {t.learn.categories[article.category]}
      </Link>{" "}
      · {article.readingMinutes} {t.common.minutes} · <span className="font-normal normal-case tracking-normal">{formatDate(article.publishAt ?? article.date, lang)}</span>
    </p>
  );
}

/* Pas de lien englobant toute la carte : la catégorie est un lien à part, et deux
   liens imbriqués seraient du HTML invalide. L'image et le titre mènent à l'article. */
export function ArticleCard({ lang, article, t }: { lang: Locale; article: Article; t: Dictionary }) {
  const a = article.i18n[lang];
  const url = href(lang, `/learn/${article.slug}`);
  return (
    <article className="group flex flex-col">
      <Link href={url} tabIndex={-1} aria-hidden className="relative block aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-coffret-soft">
        <Image src={article.image} alt="" fill sizes="(min-width: 1024px) 30vw, 90vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
      </Link>
      <div className="mt-4">
        <ArticleMeta lang={lang} article={article} t={t} />
      </div>
      <h3 className="mt-2 text-xl leading-tight">
        <Link href={url} className="hover:underline hover:underline-offset-4">
          {a.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-ink-soft">{a.excerpt}</p>
    </article>
  );
}

/** Article mis en avant en tête de liste (le plus récent de la liste). */
export function FeaturedArticle({ lang, article, t }: { lang: Locale; article: Article; t: Dictionary }) {
  const a = article.i18n[lang];
  const url = href(lang, `/learn/${article.slug}`);
  return (
    <article className="group grid items-center gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
      <Link href={url} tabIndex={-1} aria-hidden className="relative block aspect-[16/10] overflow-hidden rounded-[2rem] bg-coffret-soft">
        <Image src={article.image} alt="" fill loading="eager" fetchPriority="high" sizes="(min-width: 1024px) 55vw, 90vw" className="object-cover transition duration-700 group-hover:scale-[1.02]" />
      </Link>
      <div>
        <Kicker>{t.learn.featured}</Kicker>
        <div className="mt-4">
          <ArticleMeta lang={lang} article={article} t={t} />
        </div>
        <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">
          <Link href={url} className="hover:underline hover:underline-offset-4">
            {a.title}
          </Link>
        </h2>
        <p className="mt-4 text-lg text-ink-soft">{a.excerpt}</p>
      </div>
    </article>
  );
}

export function PageHero({ kicker, a, b, intro }: { kicker?: string; a: string; b?: string; intro?: string }) {
  return (
    <section className="bg-coffret-soft">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:pb-24 lg:pt-24">
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <Title as="h1" a={a} b={b} className="bm-up mt-4 max-w-4xl text-5xl sm:text-6xl lg:text-7xl" />
        {intro ? <p className="bm-up bm-up-2 mt-6 max-w-2xl text-lg text-ink-soft">{intro}</p> : null}
      </div>
    </section>
  );
}
