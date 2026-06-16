import Link from "next/link";
import { FileText } from "lucide-react";
import { FormsSubnav } from "@/components/forms/forms-subnav";
import { SubmissionsList } from "@/components/forms/submissions-list";
import { formularzeDemo } from "@/lib/data";

export default function FormularzeOtrzymanePage() {
  const nowe = formularzeDemo.filter((f) => f.status === "nowe").length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 font-serif text-2xl text-foreground">
          <FileText className="size-6 text-primary" aria-hidden />
          Formularze
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Otrzymane zgłoszenia ze sklepu · {nowe} nowych
        </p>
      </header>

      <FormsSubnav />
      <SubmissionsList />
    </div>
  );
}
