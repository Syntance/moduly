import { getModulyConfig } from "@moduly/magazyn-core/config";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getPostgresAuth, nextCookieAdapter } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MagazynLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { branding, basePath, auth } = getModulyConfig();
  const cookieAdapter = await nextCookieAdapter();
  const token = await cookieAdapter.get(auth.cookieName);

  if (token) {
    const session = await getPostgresAuth().validateCookieSession(cookieAdapter);
    if (session) {
      const { redirect: redirectPath } = await searchParams;
      redirect(
        redirectPath?.startsWith(`${basePath}/panel`) ? redirectPath : `${basePath}/panel`,
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium tracking-[0.25em] text-muted-foreground uppercase">
            {branding.name}
          </p>
          <h1 className="mt-2 font-serif text-2xl text-foreground">{branding.panelTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zaloguj się, aby zarządzać treściami witryny.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
