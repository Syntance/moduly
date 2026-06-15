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
import { GripVertical, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
import { cn } from "@moduly/ui";
import { isImageFile, useFileDropZone } from "@moduly/magazyn-core/hooks/use-file-drop-zone";

type ProductImagesEditorProps = {
	images: string[];
	onChange: (images: string[]) => void;
	uploading: boolean;
	onUploadFiles: (files: File[]) => void;
};

function SortableProductImage({
	url,
	index,
	onRemove,
}: {
	url: string;
	index: number;
	onRemove: () => void;
}) {
	const isMain = index === 0;
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: url,
	});

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"relative size-24 overflow-hidden rounded-lg border bg-muted",
				isMain ? "border-primary ring-2 ring-primary/25" : "border-border",
				isDragging && "z-10 opacity-70 shadow-lg",
			)}
		>
			<Image src={url} alt="" fill sizes="96px" className="object-cover" />
			{isMain ? (
				<span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
					Główne
				</span>
			) : (
				<span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
					{index + 1}
				</span>
			)}
			<button
				type="button"
				aria-label={`Przeciągnij zdjęcie ${index + 1}`}
				className="absolute right-1 bottom-1 z-10 inline-flex size-6 cursor-grab touch-none items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-3.5" aria-hidden />
			</button>
			<button
				type="button"
				aria-label="Usuń zdjęcie"
				onClick={onRemove}
				className="absolute right-1 top-1 z-10 grid size-6 place-items-center rounded-md bg-background/80 text-muted-foreground hover:text-destructive"
			>
				<X className="size-3.5" aria-hidden />
			</button>
		</div>
	);
}

export function ProductImagesEditor({
	images,
	onChange,
	uploading,
	onUploadFiles,
}: ProductImagesEditorProps) {
	const fileId = useId();

	const { isDragging, dropZoneProps } = useFileDropZone({
		disabled: uploading,
		accept: isImageFile,
		onDropFiles: onUploadFiles,
	});

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = images.indexOf(String(active.id));
		const newIndex = images.indexOf(String(over.id));
		if (oldIndex === -1 || newIndex === -1) return;
		onChange(arrayMove(images, oldIndex, newIndex));
	}

	return (
		<div className="flex flex-col gap-2">
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={images} strategy={rectSortingStrategy}>
					<div
						{...dropZoneProps}
						className={cn(
							"flex flex-wrap gap-3 rounded-lg p-2 transition-colors",
							isDragging && "bg-primary/5 ring-2 ring-primary ring-offset-2",
						)}
					>
						{images.map((url, index) => (
							<SortableProductImage
								key={url}
								url={url}
								index={index}
								onRemove={() => { onChange(images.filter((_, i) => i !== index)); }}
							/>
						))}
						<label
							htmlFor={fileId}
							className={cn(
								"grid size-24 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted",
								isDragging && "border-primary bg-primary/5",
								uploading && "pointer-events-none opacity-60",
							)}
						>
							{uploading ? (
								<Loader2 className="size-5 animate-spin" aria-hidden />
							) : (
								<ImagePlus className="size-5" aria-hidden />
							)}
						</label>
						<input
							id={fileId}
							type="file"
							accept="image/*"
							multiple
							className="sr-only"
							disabled={uploading}
							onChange={(e) => {
								onUploadFiles(Array.from(e.target.files ?? []));
								e.target.value = "";
							}}
						/>
					</div>
				</SortableContext>
			</DndContext>
			<p className="text-xs text-muted-foreground">
				Przeciągnij uchwyt, aby zmienić kolejność. Pierwsze zdjęcie jest główne na sklepie.
				Nowe pliki możesz też upuścić na pole lub wybrać z dysku.
			</p>
		</div>
	);
}
