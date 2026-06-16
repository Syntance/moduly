import Link from "next/link";
import { FileText } from "lucide-react";
import { FormsManager } from "@/components/forms/forms-manager";
import { FormsSubnav } from "@/components/forms/forms-subnav";
import { defaultFormsConfig } from "@/lib/forms-data";

export default function FormularzeKonfiguracjaPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 font-serif text-2xl text-foreground">
          <FileText className="size-6 text-primary" aria-hidden />
          Formularze
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Formularze kontaktowe na podstronach sklepu: tematy, odbiorcy zespołu i mapowanie ścieżek.
          Potwierdzenie dla klienta — jeden szablon w{" "}
          <Link href="/magazyn/maile" className="text-primary underline underline-offset-4">
            E-maile → Formularze
          </Link>
          .
        </p>
      </header>

      <FormsSubnav />
      <FormsManager initialConfig={defaultFormsConfig} />
    </div>
  );
}
