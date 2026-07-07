import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";

export const metadata: Metadata = {
  title: "Zamówienie",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Strona główna", href: "/" },
          { label: "Koszyk", href: "/koszyk" },
          { label: "Zamówienie" },
        ]}
      />
      <h1 className="font-display text-2xl font-bold text-brand-800 mb-8">
        Zamówienie
      </h1>
      <CheckoutForm />
    </div>
  );
}
