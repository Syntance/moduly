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
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@moduly/ui";
import type { Block } from "./template-types";
import { editorBtnRounded } from "./editor-chrome";
import { BLOCK_META } from "./block-meta";

function snippet(block: Block): string {
	switch (block.type) {
		case "heading":
		case "text":
		case "footer":
			return block.text.slice(0, 60) || "(pusty)";
		case "image":
			return block.alt || (block.src ? "obraz" : "(brak obrazu)");
		case "button":
			return block.label;
		case "divider":
			return "linia pozioma";
		case "spacer":
			return `${block.height} px`;
		case "orderItems":
			return "lista pozycji zamówienia";
		case "columns":
			return `2 kolumny (${block.left.length} / ${block.right.length})`;
	}
}

function SortableRow({
	block,
	selected,
	onSelect,
	onDuplicate,
	onDelete,
}: {
	block: Block;
	selected: boolean;
	onSelect: () => void;
	onDuplicate: () => void;
	onDelete: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
	const Icon = BLOCK_META[block.type].icon;

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"flex items-center gap-2 rounded-lg border bg-card px-2 py-2 transition-colors",
				selected ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-foreground/30",
				isDragging && "opacity-60",
			)}
		>
			<button
				type="button"
				aria-label="Przeciągnij, aby zmienić kolejność"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" aria-hidden />
			</button>

			<button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
				<Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
				<span className="min-w-0">
					<span className="block text-xs font-medium text-foreground">{BLOCK_META[block.type].label}</span>
					<span className="block truncate text-xs text-muted-foreground">{snippet(block)}</span>
				</span>
			</button>

			<button
				type="button"
				aria-label="Duplikuj blok"
				onClick={onDuplicate}
				className={cn(editorBtnRounded, "inline-flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground")}
			>
				<Copy className="size-3.5" aria-hidden />
			</button>
			<button
				type="button"
				aria-label="Usuń blok"
				onClick={onDelete}
				className={cn(editorBtnRounded, "inline-flex size-7 items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}
			>
				<Trash2 className="size-3.5" aria-hidden />
			</button>
		</div>
	);
}

export function EditorCanvas({
	blocks,
	selectedId,
	onSelect,
	onReorder,
	onDuplicate,
	onDelete,
}: {
	blocks: Block[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	onReorder: (blocks: Block[]) => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = blocks.findIndex((b) => b.id === active.id);
		const newIndex = blocks.findIndex((b) => b.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;
		onReorder(arrayMove(blocks, oldIndex, newIndex));
	}

	if (blocks.length === 0) {
		return (
			<p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
				Pusty szablon. Dodaj blok z palety po lewej.
			</p>
		);
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
				<div className="flex flex-col gap-2">
					{blocks.map((block) => (
						<SortableRow
							key={block.id}
							block={block}
							selected={block.id === selectedId}
							onSelect={() => { onSelect(block.id); }}
							onDuplicate={() => { onDuplicate(block.id); }}
							onDelete={() => { onDelete(block.id); }}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
