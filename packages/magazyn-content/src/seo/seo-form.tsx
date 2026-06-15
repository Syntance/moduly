"use client";

import { Loader2, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@moduly/ui";
import { Input } from "@moduly/ui";
import type { SeoMeta, SiteSettings } from "@moduly/types";
import { saveGlobalSeoAction, savePageSeoAction } from "./seo-actions";
import { cmsSaveSuccessMessage } from "../cms-save-feedback";
import { OgImageField } from "./og-image-field";

const inputClass =
	"w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Props =
	| { mode: "global"; initial: SiteSettings }
	| { mode: "page"; pageId: string; path: string; initial: SeoMeta | undefined };

export function SeoForm(props: Props) {
	if (props.mode === "global") {
		return <GlobalSeoForm initial={props.initial} />;
	}
	return (
		<PageSeoForm pageId={props.pageId} path={props.path} initial={props.initial} />
	);
}

function GlobalSeoForm({ initial }: { initial: SiteSettings }) {
	const [title, setTitle] = useState(initial.title);
	const [description, setDescription] = useState(initial.description);
	const [titleTemplate, setTitleTemplate] = useState(initial.titleTemplate ?? "");
	const [googleVerification, setGoogleVerification] = useState(initial.googleSiteVerification ?? "");
	const [defaultOg, setDefaultOg] = useState(initial.defaultOgImageUrl ?? "");
	const [seo, setSeo] = useState<SeoMeta>(initial.seo ?? {});
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function updateSeo(patch: Partial<SeoMeta>) {
		setSeo((prev) => ({ ...prev, ...patch }));
	}

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccessMessage(null);
		startTransition(async () => {
			const result = await saveGlobalSeoAction({
				title: title.trim(),
				description,
				titleTemplate: titleTemplate.trim() || undefined,
				defaultOgImageUrl: defaultOg || undefined,
				googleSiteVerification: googleVerification.trim() || undefined,
				seo,
			});
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setSuccessMessage(cmsSaveSuccessMessage());
		});
	}

	return (
		<form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5">
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">Tytuł witryny</label>
				<Input value={title} onChange={(e) => { setTitle(e.target.value); }} required className="h-10" />
			</div>
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">Opis witryny</label>
				<textarea value={description} onChange={(e) => { setDescription(e.target.value); }} rows={3} className={inputClass} />
			</div>
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">Szablon tytułu</label>
				<Input value={titleTemplate} onChange={(e) => { setTitleTemplate(e.target.value); }} placeholder="%s | Lumine Concept" className="h-10" />
				<p className="text-xs text-muted-foreground">
					<code className="text-[11px]">%s</code> to tytuł danej podstrony — reszta szablonu dokleja się automatycznie.
					Przykład: przy szablonie <code className="text-[11px]">%s | Lumine Concept</code> strona „Sklep” ma tytuł{" "}
					<strong className="font-medium text-foreground">Sklep | Lumine Concept</strong> w zakładce i w Google.
				</p>
			</div>
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">Google Site Verification</label>
				<Input value={googleVerification} onChange={(e) => { setGoogleVerification(e.target.value); }} className="h-10" />
			</div>
			<OgImageField
				label="Domyślne zdjęcie OG"
				value={defaultOg}
				onChange={setDefaultOg}
				description="Bez własnego pliku witryna korzysta z domyślnego obrazu OG generowanego automatycznie przez Vercel (Next.js OG Image). To rekomendowane — bez uploadu i redeployu, spójny branding na podstronach bez dedykowanego zdjęcia."
			/>
			<SeoFields seo={seo} onChange={updateSeo} />
			<FormFooter error={error} successMessage={successMessage} pending={pending} />
		</form>
	);
}

function PageSeoForm({
	pageId,
	path,
	initial,
}: {
	pageId: string;
	path: string;
	initial: SeoMeta | undefined;
}) {
	const [seo, setSeo] = useState<SeoMeta>(initial ?? {});
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function updateSeo(patch: Partial<SeoMeta>) {
		setSeo((prev) => ({ ...prev, ...patch }));
	}

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccessMessage(null);
		startTransition(async () => {
			const result = await savePageSeoAction(pageId, seo, path);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setSuccessMessage(cmsSaveSuccessMessage());
		});
	}

	return (
		<form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5">
			<p className="text-sm text-muted-foreground">
				SEO dla podstrony. Puste pola korzystają z domyślnych wartości witryny.
			</p>
			<SeoFields seo={seo} onChange={updateSeo} />
			<FormFooter error={error} successMessage={successMessage} pending={pending} />
		</form>
	);
}

function SeoFields({
	seo,
	onChange,
}: {
	seo: SeoMeta;
	onChange: (patch: Partial<SeoMeta>) => void;
}) {
	return (
		<fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4">
			<legend className="px-1 text-sm font-medium">Meta tagi</legend>
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">Meta Title (max 70)</label>
				<Input value={seo.metaTitle ?? ""} onChange={(e) => { onChange({ metaTitle: e.target.value }); }} maxLength={70} className="h-10" />
			</div>
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">Meta Description (max 160)</label>
				<textarea value={seo.metaDescription ?? ""} onChange={(e) => { onChange({ metaDescription: e.target.value }); }} maxLength={160} rows={3} className={inputClass} />
			</div>
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">OG Title</label>
				<Input value={seo.ogTitle ?? ""} onChange={(e) => { onChange({ ogTitle: e.target.value }); }} className="h-10" />
			</div>
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">OG Description</label>
				<textarea value={seo.ogDescription ?? ""} onChange={(e) => { onChange({ ogDescription: e.target.value }); }} rows={2} className={inputClass} />
			</div>
			<OgImageField
				label="OG Image"
				value={seo.ogImageUrl ?? ""}
				onChange={(url) => { onChange({ ogImageUrl: url }); }}
				description="Puste pole korzysta z domyślnego obrazu witryny lub — gdy też puste — z obrazu OG generowanego przez Vercel. Zostawienie pustego pola jest rekomendowane, o ile nie potrzebujesz dedykowanego podglądu dla tej podstrony."
			/>
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium">Canonical URL</label>
				<Input value={seo.canonicalUrl ?? ""} onChange={(e) => { onChange({ canonicalUrl: e.target.value }); }} className="h-10" />
			</div>
			<label className="flex items-center gap-2 text-sm">
				<input type="checkbox" checked={seo.noIndex ?? false} onChange={(e) => { onChange({ noIndex: e.target.checked }); }} className="size-4 rounded border-input" />
				No Index
			</label>
			<label className="flex items-center gap-2 text-sm">
				<input type="checkbox" checked={seo.noFollow ?? false} onChange={(e) => { onChange({ noFollow: e.target.checked }); }} className="size-4 rounded border-input" />
				No Follow
			</label>
		</fieldset>
	);
}

function FormFooter({
	error,
	successMessage,
	pending,
}: {
	error: string | null;
	successMessage: string | null;
	pending: boolean;
}) {
	return (
		<div className="flex flex-col gap-2">
			{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
			{successMessage ? (
				<p role="status" className="text-sm text-emerald-600">
					{successMessage}
				</p>
			) : null}
			<Button type="submit" disabled={pending} className="h-10 w-fit gap-1.5">
				{pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
				{pending ? "Zapisywanie…" : "Zapisz SEO"}
			</Button>
		</div>
	);
}
