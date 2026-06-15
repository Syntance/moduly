"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@moduly/ui";
import { Input } from "@moduly/ui";
import { cn } from "@moduly/ui";
import type { InstagramTile } from "@moduly/types";
import { isCmsImageUnoptimized, resolveCmsAdminPreviewUrl } from "@moduly/magazyn-core/client";
import { newCmsId } from "./cms-id";
import { OgImageField } from "./seo/og-image-field";

const MAX_TILES = 6;

type Props = {
	value: InstagramTile[];
	onChange: (tiles: InstagramTile[]) => void;
};

function SortableTile({
	tile,
	index,
	selected,
	onSelect,
}: {
	tile: InstagramTile;
	index: number;
	selected: boolean;
	onSelect: () => void;
}) {
	const previewUrl = tile.imageUrl ? resolveCmsAdminPreviewUrl(tile.imageUrl) ?? tile.imageUrl : "";
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: tile.id,
	});

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"relative aspect-square overflow-hidden rounded-md border bg-muted/30",
				selected ? "border-primary ring-2 ring-primary/30" : "border-border",
				isDragging && "z-10 opacity-70 shadow-lg",
			)}
		>
			<button
				type="button"
				onClick={onSelect}
				className="absolute inset-0 z-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				aria-label={`Kafelek ${index + 1}${tile.postUrl ? "" : " — uzupełnij dane"}`}
				aria-pressed={selected}
			>
				{previewUrl ? (
					<Image
						src={previewUrl}
						alt=""
						fill
						sizes="120px"
						className="object-cover"
						unoptimized={isCmsImageUnoptimized(previewUrl)}
					/>
				) : (
					<span className="flex size-full items-center justify-center text-muted-foreground">
						<ImageIcon className="size-6" aria-hidden />
					</span>
				)}
			</button>
			<span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
				{index + 1}
			</span>
			<button
				type="button"
				aria-label={`Przeciągnij kafelek ${index + 1}`}
				className="absolute right-1 top-1 z-10 inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-3.5" aria-hidden />
			</button>
		</div>
	);
}

export function InstagramTilesEditor({ value, onChange }: Props) {
	const tiles = value ?? [];
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selectedIndex = tiles.findIndex((tile) => tile.id === selectedId);
	const selectedTile = selectedIndex >= 0 ? tiles[selectedIndex] : null;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = tiles.findIndex((tile) => tile.id === active.id);
		const newIndex = tiles.findIndex((tile) => tile.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;
		onChange(arrayMove(tiles, oldIndex, newIndex));
	}

	function addTile() {
		if (tiles.length >= MAX_TILES) return;
		const tile: InstagramTile = { id: newCmsId("ig"), postUrl: "", imageUrl: "" };
		onChange([...tiles, tile]);
		setSelectedId(tile.id);
	}

	function updateSelected(patch: Partial<InstagramTile>) {
		if (selectedIndex < 0) return;
		onChange(tiles.map((tile, index) => (index === selectedIndex ? { ...tile, ...patch } : tile)));
	}

	function removeSelected() {
		if (selectedIndex < 0) return;
		onChange(tiles.filter((_, index) => index !== selectedIndex));
		setSelectedId(null);
	}

	const emptySlots = Math.max(0, MAX_TILES - tiles.length);

	return (
		<fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
			<legend className="px-1 text-sm font-medium">Instagram (HP, max 6)</legend>
			<p className="text-xs text-muted-foreground">
				Układ jak na stronie głównej (3×2 / 1×6). Przeciągnij kafelek za uchwyt, aby zmienić kolejność.
			</p>

			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={tiles.map((tile) => tile.id)} strategy={rectSortingStrategy}>
					<div className="grid max-w-xl grid-cols-3 gap-2 sm:grid-cols-6">
						{tiles.map((tile, index) => (
							<SortableTile
								key={tile.id}
								tile={tile}
								index={index}
								selected={tile.id === selectedId}
								onSelect={() => { setSelectedId(tile.id); }}
							/>
						))}
						{Array.from({ length: emptySlots }, (_, slotIndex) => (
							<div
								key={`empty-${slotIndex}`}
								className="relative flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-muted/20"
							>
								{slotIndex === 0 ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={addTile}
										disabled={tiles.length >= MAX_TILES}
										className="h-auto flex-col gap-1 px-2 py-3 text-xs text-muted-foreground"
									>
										<Plus className="size-4" aria-hidden />
										Dodaj
									</Button>
								) : (
									<span className="text-[10px] tabular-nums text-muted-foreground/70">
										{tiles.length + slotIndex + 1}
									</span>
								)}
							</div>
						))}
					</div>
				</SortableContext>
			</DndContext>

			{selectedTile ? (
				<div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm font-medium">
							Kafelek {selectedIndex + 1}
							<span className="ml-1 font-normal text-muted-foreground">— edycja</span>
						</span>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={removeSelected}
							className="h-8 gap-1 text-destructive hover:text-destructive"
						>
							<Trash2 className="size-4" aria-hidden />
							Usuń
						</Button>
					</div>
					<Input
						value={selectedTile.postUrl}
						onChange={(e) => { updateSelected({ postUrl: e.target.value }); }}
						placeholder="URL posta na Instagramie"
						className="h-9"
					/>
					<OgImageField
						label="Miniatura"
						value={selectedTile.imageUrl}
						onChange={(url) => { updateSelected({ imageUrl: url }); }}
					/>
				</div>
			) : tiles.length > 0 ? (
				<p className="text-xs text-muted-foreground">Kliknij kafelek na siatce, aby edytować URL i zdjęcie.</p>
			) : null}

			{tiles.length > 0 && tiles.length < MAX_TILES ? (
				<Button type="button" variant="outline" size="sm" onClick={addTile} className="w-fit gap-1">
					<Plus className="size-4" aria-hidden />
					Dodaj kafelek
				</Button>
			) : null}
		</fieldset>
	);
}
