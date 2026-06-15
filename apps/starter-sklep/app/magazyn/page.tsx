import { redirect } from "next/navigation";
import { modulyConfig } from "@/moduly.config";
import { getSessionToken } from "@moduly/magazyn-core";
import { LoginForm } from "@/components/auth/login-form";

export default async function MagazynLoginPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
	const token = await getSessionToken();
	const { error, redirect: redirectTo } = await searchParams;
	const { branding, auth } = modulyConfig;

	if (token) {
		redirect(redirectTo ?? `${modulyConfig.basePath}/panel`);
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
						Zaloguj się, aby zarządzać sklepem.
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
					<LoginForm googleEnabled={auth.google} googleError={error === "google"} />
				</div>
			</div>
		</main>
	);
}
