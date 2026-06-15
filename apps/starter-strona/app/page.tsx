import { getPageContent } from "@moduly/cms";
import Link from "next/link";

export default async function HomePage() {
  const content = await getPageContent("home");
  const hero = content.hero;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <span className="font-serif text-lg text-foreground">Przykładowa Strona</span>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/kontakt"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Kontakt
            </Link>
            <Link
              href="/magazyn"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Panel
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-24">
        <p className="text-xs font-medium tracking-[0.25em] text-muted-foreground uppercase">
          Strona główna
        </p>
        <h1 className="max-w-3xl font-serif text-4xl leading-tight text-foreground md:text-5xl">
          {hero?.headline ?? "Witaj"}
        </h1>
        {hero?.description ? (
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
            {hero.description}
          </p>
        ) : null}
        {hero?.ctaLabel ? (
          <Link
            href={hero.ctaHref ?? "/kontakt"}
            className="inline-flex w-fit rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {hero.ctaLabel}
          </Link>
        ) : null}
      </section>
    </main>
  );
}
