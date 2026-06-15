"use client";

import { Trash2, Upload } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { cn } from "@moduly/ui";
import { isImageFile, useFileDropZone } from "@moduly/magazyn-core/hooks/use-file-drop-zone";
import type {
	Block,
	BlockStyle,
	ButtonBlock,
	ColumnsBlock,
	ImageBlock,
	LeafBlock,
} from "./template-types";
import { editorBtnRounded } from "./editor-chrome";
import { BLOCK_META, createBlock, LEAF_PALETTE } from "./block-meta";
import { RichTextEditor } from "./rich-text-editor";
import { FONT_OPTIONS } from "./email-fonts";

import {
	AlignField,
	ColorField,
	NumberField,
	SelectField,
	TextField,
	ToggleField,
} from "./fields";

export type ImageUploader = (file: File) => Promise<{ url?: string; error?: string }>;

function StyleEditor({
	style,
	onChange,
	withColor = true,
	hideMetrics = false,
}: {
	style: BlockStyle;
	onChange: (next: BlockStyle) => void;
	withColor?: boolean;
	/** Rozmiar i odstęp Y — w toolbarze RichTextEditor. */
	hideMetrics?: boolean;
}) {
	const patch = (p: Partial<BlockStyle>) => { onChange({ ...style, ...p }); };
	return (
		<div className="flex flex-col gap-3">
			<SelectField
				label="Czcionka"
				value={style.fontKey ?? ""}
				options={[
					{ value: "", label: "Domyślna (z motywu)" },
					...FONT_OPTIONS,
				]}
				onChange={(value) =>
					{ patch({ fontKey: value ? (value) : undefined }); }
				}
			/>
			{withColor ? (
				<ColorField label="Kolor tekstu" value={style.color ?? "#2a1f14"} onChange={(color) => { patch({ color }); }} />
			) : null}
			{hideMetrics ? null : (
				<div className="grid grid-cols-2 gap-3">
					<NumberField label="Rozmiar (px)" value={style.fontSize ?? 14} min={8} max={48} onChange={(fontSize) => { patch({ fontSize }); }} />
					<NumberField label="Odstęp Y (px)" value={style.paddingY ?? 6} min={0} max={64} onChange={(paddingY) => { patch({ paddingY }); }} />
				</div>
			)}
			<AlignField value={style.align ?? "left"} onChange={(align) => { patch({ align }); }} />
			<div className="flex gap-4">
				<ToggleField label="Pogrubienie" checked={style.bold ?? false} onChange={(bold) => { patch({ bold }); }} />
				<ToggleField label="Kursywa" checked={style.italic ?? false} onChange={(italic) => { patch({ italic }); }} />
			</div>
		</div>
	);
}

function ImageEditor({
	block,
	onChange,
	onUpload,
}: {
	block: ImageBlock;
	onChange: (next: ImageBlock) => void;
	onUpload: ImageUploader;
}) {
	const inputId = useId();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleFile = useCallback(
		async (file: File | undefined) => {
			if (!file) return;
			setPending(true);
			setError(null);
			const result = await onUpload(file);
			setPending(false);
			if (result.error || !result.url) {
				setError(result.error ?? "Upload nie powiódł się.");
				return;
			}
			onChange({ ...block, src: result.url });
		},
		[block, onChange, onUpload],
	);

	const { isDragging, dropZoneProps } = useFileDropZone({
		disabled: pending,
		accept: isImageFile,
		onDropFiles: (files) => {
			void handleFile(files[0]);
		},
	});

	return (
		<div className="flex flex-col gap-3">
			<div
				{...dropZoneProps}
				className={cn(
					"flex flex-col gap-1.5 rounded-lg p-1 transition-colors",
					isDragging && "bg-primary/5 ring-2 ring-primary ring-offset-2",
				)}
			>
				<span className="text-sm font-medium">Obraz</span>
				{block.src ? (

					<img src={block.src} alt="" className="max-h-32 w-full rounded-md border border-border object-contain" />
				) : (
					<div
						className={cn(
							"grid h-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground",
							isDragging && "border-primary bg-primary/5",
						)}
					>
						Przeciągnij zdjęcie lub kliknij poniżej
					</div>
				)}
				<label
					htmlFor={inputId}
					className={cn(
						"inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-ring/50",
						isDragging && "border-primary bg-primary/5",
						pending && "pointer-events-none opacity-60",
					)}
				>
					<Upload className="size-4" aria-hidden />
					{pending ? "Wysyłanie…" : "Wgraj obraz"}
				</label>
				<input
					id={inputId}
					type="file"
					accept="image/*"
					className="sr-only"
					disabled={pending}
					onChange={(e) => {
						void handleFile(e.target.files?.[0]);
						e.target.value = "";
					}}
				/>
				{error ? (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				) : null}
			</div>

			<TextField label="Tekst alternatywny (alt)" value={block.alt} onChange={(alt) => { onChange({ ...block, alt }); }} />
			<TextField
				label="Link po kliknięciu (opcjonalny)"
				value={block.href ?? ""}
				placeholder="https://…"
				onChange={(href) => { onChange({ ...block, href: href || undefined }); }}
			/>
			<div className="grid grid-cols-2 gap-3">
				<NumberField label="Szerokość (px)" value={block.width} min={16} max={600} onChange={(width) => { onChange({ ...block, width }); }} />
				<NumberField label="Odstęp Y (px)" value={block.paddingY ?? 8} min={0} max={64} onChange={(paddingY) => { onChange({ ...block, paddingY }); }} />
			</div>
			<AlignField value={block.align} onChange={(align) => { onChange({ ...block, align }); }} />
		</div>
	);
}

function ButtonEditor({ block, onChange }: { block: ButtonBlock; onChange: (next: ButtonBlock) => void }) {
	return (
		<div className="flex flex-col gap-3">
			<TextField label="Etykieta" value={block.label} onChange={(label) => { onChange({ ...block, label }); }} />
			<TextField label="Adres (URL)" value={block.href} onChange={(href) => { onChange({ ...block, href }); }} />
			<SelectField
				label="Czcionka"
				value={block.fontKey ?? ""}
				options={[
					{ value: "", label: "Domyślna (z motywu)" },
					...FONT_OPTIONS,
				]}
				onChange={(value) =>
					{ onChange({ ...block, fontKey: value ? (value) : undefined }); }
				}
			/>
			<div className="grid grid-cols-2 gap-3">
				<ColorField label="Tło" value={block.bg ?? "#c8622a"} onChange={(bg) => { onChange({ ...block, bg }); }} />
				<ColorField label="Tekst" value={block.color ?? "#ffffff"} onChange={(color) => { onChange({ ...block, color }); }} />
			</div>
			<div className="grid grid-cols-2 gap-3">
				<NumberField label="Zaokrąglenie (px)" value={block.radius ?? 8} min={0} max={32} onChange={(radius) => { onChange({ ...block, radius }); }} />
				<NumberField label="Odstęp Y (px)" value={block.paddingY ?? 10} min={0} max={64} onChange={(paddingY) => { onChange({ ...block, paddingY }); }} />
			</div>
			<AlignField value={block.align ?? "left"} onChange={(align) => { onChange({ ...block, align }); }} />
		</div>
	);
}

function LeafEditor({
	block,
	onChange,
	onUpload,
}: {
	block: LeafBlock;
	onChange: (next: LeafBlock) => void;
	onUpload: ImageUploader;
}) {
	switch (block.type) {
		case "heading": {
			const b = block;
			return (
				<div className="flex flex-col gap-3">
					<RichTextEditor
						label="Treść"
						value={b.text}
						singleLine
						blockFontSize={b.style.fontSize ?? (b.level === 1 ? 22 : b.level === 2 ? 18 : 16)}
						paddingY={b.style.paddingY ?? 8}
						onChange={(text) => { onChange({ ...b, text }); }}
						onBlockFontSizeChange={(fontSize) => { onChange({ ...b, style: { ...b.style, fontSize } }); }}
						onPaddingYChange={(paddingY) => { onChange({ ...b, style: { ...b.style, paddingY } }); }}
					/>
					<SelectField
						label="Poziom"
						value={String(b.level)}
						options={[
							{ value: "1", label: "H1 — duży" },
							{ value: "2", label: "H2 — średni" },
							{ value: "3", label: "H3 — mały" },
						]}
						onChange={(v) => { onChange({ ...b, level: Number(v) as 1 | 2 | 3 }); }}
					/>
					<StyleEditor style={b.style} hideMetrics onChange={(style) => { onChange({ ...b, style }); }} />
				</div>
			);
		}
		case "text": {
			const b = block;
			return (
				<div className="flex flex-col gap-3">
					<RichTextEditor
						label="Treść"
						value={b.text}
						rows={5}
						blockFontSize={b.style.fontSize ?? 14}
						paddingY={b.style.paddingY ?? 6}
						onChange={(text) => { onChange({ ...b, text }); }}
						onBlockFontSizeChange={(fontSize) => { onChange({ ...b, style: { ...b.style, fontSize } }); }}
						onPaddingYChange={(paddingY) => { onChange({ ...b, style: { ...b.style, paddingY } }); }}
					/>
					<StyleEditor style={b.style} hideMetrics onChange={(style) => { onChange({ ...b, style }); }} />
				</div>
			);
		}
		case "image":
			return <ImageEditor block={block} onChange={(b) => { onChange(b); }} onUpload={onUpload} />;
		case "button":
			return <ButtonEditor block={block} onChange={(b) => { onChange(b); }} />;
		case "divider": {
			const b = block;
			return (
				<div className="flex flex-col gap-3">
					<ColorField label="Kolor linii" value={b.color ?? "#e8dcc0"} onChange={(color) => { onChange({ ...b, color }); }} />
					<NumberField label="Odstęp Y (px)" value={b.paddingY ?? 10} min={0} max={64} onChange={(paddingY) => { onChange({ ...b, paddingY }); }} />
				</div>
			);
		}
		case "spacer": {
			const b = block;
			return <NumberField label="Wysokość (px)" value={b.height} min={2} max={160} onChange={(height) => { onChange({ ...b, height }); }} />;
		}
	}
}

function ColumnsEditor({
	block,
	onChange,
	onUpload,
}: {
	block: ColumnsBlock;
	onChange: (next: ColumnsBlock) => void;
	onUpload: ImageUploader;
}) {
	function renderSide(side: "left" | "right") {
		const items = block[side];
		return (
			<div className="flex flex-col gap-2 rounded-lg border border-border p-3">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{side === "left" ? "Lewa kolumna" : "Prawa kolumna"}
					</span>
				</div>
				{items.map((leaf) => (
					<div key={leaf.id} className="rounded-md border border-border/70 bg-muted/20 p-2">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-xs font-medium">{BLOCK_META[leaf.type].label}</span>
							<button
								type="button"
								aria-label="Usuń element kolumny"
								onClick={() => { onChange({ ...block, [side]: items.filter((i) => i.id !== leaf.id) }); }}
								className="text-muted-foreground hover:text-destructive"
							>
								<Trash2 className="size-3.5" aria-hidden />
							</button>
						</div>
						<LeafEditor
							block={leaf}
							onUpload={onUpload}
							onChange={(next) => { onChange({ ...block, [side]: items.map((i) => (i.id === leaf.id ? next : i)) }); }}
						/>
					</div>
				))}
				<div className="flex flex-wrap gap-1">
					{LEAF_PALETTE.map((type) => {
						const Icon = BLOCK_META[type].icon;
						return (
							<button
								key={type}
								type="button"
								onClick={() => { onChange({ ...block, [side]: [...items, createBlock(type) as LeafBlock] }); }}
								className={cn(
									editorBtnRounded,
									"inline-flex items-center gap-1 border border-input px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
								)}
							>
								<Icon className="size-3.5" aria-hidden />
								{BLOCK_META[type].label}
							</button>
						);
					})}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="grid grid-cols-2 gap-3">
				<NumberField label="Odstęp między (px)" value={block.gap ?? 16} min={0} max={48} onChange={(gap) => { onChange({ ...block, gap }); }} />
				<NumberField label="Odstęp Y (px)" value={block.paddingY ?? 8} min={0} max={64} onChange={(paddingY) => { onChange({ ...block, paddingY }); }} />
			</div>
			{renderSide("left")}
			{renderSide("right")}
		</div>
	);
}

export function BlockInspector({
	block,
	onChange,
	onUpload,
}: {
	block: Block;
	onChange: (next: Block) => void;
	onUpload: ImageUploader;
}) {
	const Icon = BLOCK_META[block.type].icon;
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 border-b border-border pb-3">
				<Icon className="size-4 text-muted-foreground" aria-hidden />
				<h3 className="font-serif text-base text-foreground">{BLOCK_META[block.type].label}</h3>
			</div>

			{block.type === "orderItems" ? (
				<div className="flex flex-col gap-3">
					<ToggleField
						label="Miniatury produktów"
						checked={(block).showThumbnails}
						onChange={(showThumbnails) => { onChange({ ...(block), showThumbnails }); }}
					/>
					<ToggleField
						label="Wiersz „Razem”"
						checked={(block).showTotal}
						onChange={(showTotal) => { onChange({ ...(block), showTotal }); }}
					/>
					<StyleEditor style={(block).style} withColor onChange={(style) => { onChange({ ...(block), style }); }} />
				</div>
			) : block.type === "footer" ? (
				<div className="flex flex-col gap-3">
					<RichTextEditor
						label="Treść stopki"
						value={(block).text}
						rows={3}
						blockFontSize={(block).style.fontSize ?? 11}
						paddingY={(block).style.paddingY ?? 4}
						onChange={(text) => { onChange({ ...(block), text }); }}
						onBlockFontSizeChange={(fontSize) =>
							{ onChange({ ...(block), style: { ...(block).style, fontSize } }); }
						}
						onPaddingYChange={(paddingY) =>
							{ onChange({ ...(block), style: { ...(block).style, paddingY } }); }
						}
					/>
					<StyleEditor
						style={(block).style}
						hideMetrics
						onChange={(style) => { onChange({ ...(block), style }); }}
					/>
				</div>
			) : block.type === "columns" ? (
				<ColumnsEditor block={block} onUpload={onUpload} onChange={(b) => { onChange(b); }} />
			) : (
				<LeafEditor block={block} onUpload={onUpload} onChange={(b) => { onChange(b); }} />
			)}
		</div>
	);
}
