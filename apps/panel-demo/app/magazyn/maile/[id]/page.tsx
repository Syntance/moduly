import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EmailEditor } from "@/components/emails/email-editor";
import { getMailById, maileEditorDemo } from "@/lib/email-data";

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return maileEditorDemo.map((m) => ({ id: m.id }));
}

export default async function EdytujMailPage({ params }: Props) {
  const { id } = await params;
  const mail = getMailById(id);

  if (!mail) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/magazyn/maile"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Wróć do e-maili
      </Link>

      <header>
        <h1 className="font-serif text-2xl text-foreground">{mail.nazwa}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{mail.klucz}</p>
      </header>

      <EmailEditor mail={mail} />
    </div>
  );
}
