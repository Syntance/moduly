import { getPageContent } from "@moduly/cms";
import { ContactForm } from "@moduly/magazyn-forms";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Napisz do nas — odpowiadamy w 12 godzin roboczych.",
};

export default async function KontaktPage() {
  const content = await getPageContent("kontakt");
  const hero = content.hero;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="font-serif text-lg text-foreground">
            Przykładowa Strona
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Strona główna
          </Link>
        </nav>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.25em] text-muted-foreground uppercase">
            Kontakt
          </p>
          <h1 className="font-serif text-3xl text-foreground md:text-4xl">
            {hero?.headline ?? "Napisz do nas"}
          </h1>
          {hero?.description ? (
            <p className="max-w-2xl text-pretty text-muted-foreground">{hero.description}</p>
          ) : (
            <p className="max-w-2xl text-pretty text-muted-foreground">
              Opisz krótko temat — wrócimy z odpowiedzią w 12 godzin roboczych.
            </p>
          )}
        </header>

        <ContactForm variant="page" topicPreset="kontakt" privacyPolicyHref="/polityka-prywatnosci" />
      </div>
    </main>
  );
}
