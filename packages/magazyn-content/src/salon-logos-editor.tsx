"use client";

import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@moduly/ui";
import { Input } from "@moduly/ui";
import { ConfirmDialog } from "@moduly/ui";
import { cn } from "@moduly/ui";
import type { SalonLogo } from "@moduly/types";
import { newCmsId } from "./cms-id";
import { OgImageField } from "./seo/og-image-field";

const inputClass =
	"w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Wysokość jednego wiersza listy (py-2.5 + avatar 40px). */
const LIST_ROW_HEIGHT_REM = 3.75;
const LIST_MAX_VISIBLE_ROWS = 5;

type Props = {
	value: SalonLogo[];
	onChange: (logos: SalonLogo[]) => void;
};

type DraftLogo = {
	id: string;
	name: string;
	description: string;
	alt: string;
	logoUrl: string;
	order: number;
};

function toDraft(logo: SalonLogo): DraftLogo {
	return {
		id: logo.id,
		name: logo.name,
		description: logo.description ?? "",
		alt: logo.alt ?? "",
		logoUrl: logo.logoUrl ?? "",
		order: logo.order,
	};
}

function fromDraft(draft: DraftLogo): SalonLogo {
	return {
		id: draft.id,
		name: draft.name.trim(),
		order: draft.order,
		...(draft.logoUrl ? { logoUrl: draft.logoUrl } : {}),
		...(draft.description.trim() ? { description: draft.description.trim() } : {}),
		...(draft.alt.trim() ? { alt: draft.alt.trim() } : {}),
	};
}

function emptyDraft(order: number): DraftLogo {
	return {
		id: newCmsId("logo"),
		name: "",
		description: "",
		alt: "",
		logoUrl: "",
		order,
	};
}

function SalonLogoEditDialog({
	open,
	title,
	draft,
	isNew,
	onDraftChange,
	onSave,
	onClose,
}: {
	open: boolean;
	title: string;
	draft: DraftLogo;
	isNew: boolean;
	onDraftChange: (draft: DraftLogo) => void;
	onSave: () => void;
	onClose: () => void;
}) {
	const titleId = useId();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [open, onClose]);

	if (!open || typeof document === "undefined") return null;

	function handleSave() {
		if (!draft.name.trim()) {
			setError("Podaj nazwę salonu.");
			return;
		}
		onSave();
	}

	return createPortal(
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
		>
			<button
				type="button"
				className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
				onClick={onClose}
				aria-label="Zamknij"
				tabIndex={-1}
			/>
			<div className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
				<div className="border-b border-border px-5 py-4">
					<h2 id={titleId} className="font-serif text-lg font-semibold text-foreground">
						{title}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{isNew ? "Dodaj salon do sekcji „Zaufały nam” na stronie głównej." : "Zmień dane logotypu salonu."}
					</p>
				</div>
				<div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium" htmlFor={`${draft.id}-name`}>
							Nazwa salonu
						</label>
						<Input
							id={`${draft.id}-name`}
							value={draft.name}
							onChange={(e) => { onDraftChange({ ...draft, name: e.target.value }); }}
							placeholder="np. Sabrija Store"
							className="h-10"
							autoFocus
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium" htmlFor={`${draft.id}-desc`}>
							Opis <span className="font-normal text-muted-foreground">(opcjonalnie)</span>
						</label>
						<textarea
							id={`${draft.id}-desc`}
							value={draft.description}
							onChange={(e) => { onDraftChange({ ...draft, description: e.target.value }); }}
							rows={2}
							className={inputClass}
							placeholder="Krótki opis — widoczny tylko w panelu"
						/>
					</div>
					<OgImageField
						label="Logotyp"
						value={draft.logoUrl}
						onChange={(url) => { onDraftChange({ ...draft, logoUrl: url }); }}
					/>
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium" htmlFor={`${draft.id}-alt`}>
							Tekst alternatywny (SEO)
						</label>
						<Input
							id={`${draft.id}-alt`}
							value={draft.alt}
							onChange={(e) => { onDraftChange({ ...draft, alt: e.target.value }); }}
							placeholder="Domyślnie: nazwa salonu"
							className="h-10"
						/>
						<p className="text-xs text-muted-foreground">
							Używany w atrybucie <code className="text-[11px]">alt</code> obrazka — ważny dla SEO i dostępności.
						</p>
					</div>
					{error ? (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					) : null}
				</div>
				<div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={onClose}>
						Anuluj
					</Button>
					<Button type="button" onClick={handleSave}>
						{isNew ? "Dodaj" : "Zapisz"}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

export function SalonLogosEditor({ value, onChange }: Props) {
	const logos = value ?? [];
	const [editIndex, setEditIndex] = useState<number | null>(null);
	const [draft, setDraft] = useState<DraftLogo | null>(null);
	const [isNew, setIsNew] = useState(false);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

	function openCreate() {
		setDraft(emptyDraft(logos.length));
		setEditIndex(null);
		setIsNew(true);
	}

	function openEdit(index: number) {
		const logo = logos[index];
		if (!logo) return;
		setDraft(toDraft(logo));
		setEditIndex(index);
		setIsNew(false);
	}

	function closeModal() {
		setDraft(null);
		setEditIndex(null);
		setIsNew(false);
	}

	function saveDraft() {
		if (!draft || !draft.name.trim()) return;
		const next = fromDraft(draft);
		if (isNew) {
			onChange([...logos, next]);
		} else if (editIndex !== null) {
			onChange(logos.map((item, i) => (i === editIndex ? next : item)));
		}
		closeModal();
	}

	function confirmDelete() {
		if (deleteIndex === null) return;
		onChange(logos.filter((_, i) => i !== deleteIndex).map((item, i) => ({ ...item, order: i })));
		setDeleteIndex(null);
	}

	return (
		<fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
			<div className="flex items-center justify-between gap-3">
				<legend className="px-1 text-sm font-medium">Logotypy salonów (HP)</legend>
				<Button type="button" variant="outline" size="sm" onClick={openCreate} className="h-8 gap-1 shrink-0">
					<Plus className="size-4" aria-hidden />
					Dodaj
				</Button>
			</div>

			{logos.length === 0 ? (
				<p className="text-sm text-muted-foreground">Brak logotypów. Kliknij „Dodaj”, aby dodać pierwszy salon.</p>
			) : (
				<ul
					className={cn(
						"divide-y divide-border rounded-lg border border-border",
						logos.length > LIST_MAX_VISIBLE_ROWS &&
							"overflow-y-auto overscroll-y-contain",
					)}
					style={
						logos.length > LIST_MAX_VISIBLE_ROWS
							? { maxHeight: `${LIST_MAX_VISIBLE_ROWS * LIST_ROW_HEIGHT_REM}rem` }
							: undefined
					}
				>
					{logos.map((logo, index) => (
						<li key={logo.id} className="flex items-center gap-3 px-3 py-2.5">
							<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
								{logo.logoUrl ? (
									<Image
										src={logo.logoUrl}
										alt=""
										width={40}
										height={40}
										className="size-full object-contain p-0.5"
									/>
								) : (
									<ImageIcon className="size-4 text-muted-foreground" aria-hidden />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">
									{logo.name || "Bez nazwy"}
								</p>
								{logo.description ? (
									<p className="truncate text-xs text-muted-foreground">{logo.description}</p>
								) : logo.logoUrl ? (
									<p className="truncate text-xs text-muted-foreground">Z logotypem</p>
								) : (
									<p className="truncate text-xs text-muted-foreground">Tylko tekst</p>
								)}
							</div>
							<div className="flex shrink-0 items-center gap-0.5">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => { openEdit(index); }}
									className="size-8"
									aria-label={`Edytuj ${logo.name || "salon"}`}
								>
									<Pencil className="size-4" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => { setDeleteIndex(index); }}
									className="size-8 text-destructive hover:text-destructive"
									aria-label={`Usuń ${logo.name || "salon"}`}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}

			{draft ? (
				<SalonLogoEditDialog
					open
					title={isNew ? "Nowy logotyp salonu" : "Edytuj logotyp"}
					draft={draft}
					isNew={isNew}
					onDraftChange={setDraft}
					onSave={saveDraft}
					onClose={closeModal}
				/>
			) : null}

			<ConfirmDialog
				open={deleteIndex !== null}
				title="Usunąć logotyp?"
				description="Salon zniknie z sekcji „Zaufały nam” po zapisaniu treści globalnych."
				confirmLabel="Usuń"
				variant="destructive"
				onConfirm={confirmDelete}
				onCancel={() => { setDeleteIndex(null); }}
			/>
		</fieldset>
	);
}
