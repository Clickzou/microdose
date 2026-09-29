import Link from "next/link";

/** Onglets du tableau de bord : statistiques du site et liste des inscrits. */
export default function DashboardTabs({ active }: { active: "stats" | "newsletter" }) {
  const tabs = [
    { key: "stats", href: "/seo", label: "Statistiques" },
    { key: "newsletter", href: "/seo/newsletter", label: "Newsletter" },
  ] as const;
  return (
    <nav className="flex gap-1 rounded-full bg-black/[0.04] p-1" aria-label="Onglets">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          prefetch={false}
          aria-current={t.key === active ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-[13px] transition ${
            t.key === active ? "bg-white font-semibold text-[#00112b] shadow-sm" : "text-[#5a6472] hover:text-[#00112b]"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
