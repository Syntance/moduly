import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { getProduktById, produktyDemo } from "@/lib/data";

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return produktyDemo.map((p) => ({ id: p.id }));
}

export default async function EdytujProduktPage({ params }: Props) {
  const { id } = await params;
  const product = getProduktById(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/magazyn/produkty"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Wróć do produktów
      </Link>

      <header>
        <h1 className="font-serif text-2xl text-foreground">Edytuj produkt</h1>
        <p className="mt-1 text-sm text-muted-foreground">/{product.slug}</p>
      </header>

      <ProductForm product={product} />
    </div>
  );
}
