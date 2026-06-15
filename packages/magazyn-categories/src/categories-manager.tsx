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
import { Check, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@moduly/ui";
import { Input } from "@moduly/ui";
import { CheckboxInput } from "@moduly/ui";
import { cn } from "@moduly/ui";
import { slugify } from "@moduly/magazyn-core/client";
import type { AdminCategory } from "./store";
import { deleteCategoryAction, reorderCategoriesAction, saveCategoryAction } from "./actions";

type FormState = { id?: string; name: string; description: string; isActive: boolean };

const EMPTY: FormState = { name: "", description: "", isActive: true };

const inputClass =
	"w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function SortableCategoryRow({
	category,
	pending,
	onEdit,
	onDelete,
}: {
	category: AdminCategory;
	pending: boolean;
	onEdit: (category: AdminCategory) => void;
	onDelete: (category: AdminCategory) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: category.id,
	});

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/30",
				isDragging && "opacity-60",
			)}
		>
			<button
				type="button"
				aria-label={`Zmień kolejność: ${category.name}`}
				className="inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" aria-hidden />
			</button>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-medium text-foreground">{category.name}</span>
					{!category.isActive ? (
						<span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
							ukryta
						</span>
					) : null}
					{category.needsReparent ? (
						<span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-amber-700 dark:text-amber-400">
							poza filtrem — zapisz ponownie
						</span>
					) : null}
				</div>
				<span className="text-xs text-muted-foreground">
					/{category.handle} · {category.productCount} prod.
				</span>
			</div>

			<button
				type="button"
				onClick={() => { onEdit(category); }}
				aria-label={`Edytuj ${category.name}`}
				className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<Pencil className="size-4" aria-hidden />
			</button>
			<button
				type="button"
				onClick={() => { onDelete(category); }}
				disabled={pending}
				aria-label={`Usuń ${category.name}`}
				className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-destructive/30 disabled:opacity-50"
			>
				<Trash2 className="size-4" aria-hidden />
			</button>
		</li>
	);
}

export function CategoriesManager({ categories }: { categories: AdminCategory[] }) {
	const router = useRouter();
	const [items, setItems] = useState(categories);
	const [form, setForm] = useState<FormState>(EMPTY);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const isEditing = Boolean(form.id);

	useEffect(() => {
		setItems(categories);
	}, [categories]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function startEdit(category: AdminCategory) {
		setError(null);
		setForm({
			id: category.id,
			name: category.name,
			description: category.description,
			isActive: category.isActive,
		});
	}

	function reset() {
		setForm(EMPTY);
		setError(null);
	}

	function onSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		startTransition(async () => {
			const result = await saveCategoryAction({
				id: form.id,
				name: form.name.trim(),
				description: form.description,
				isActive: form.isActive,
			});
			if (!result.ok) {
				setError(result.error);
				return;
			}
			reset();
			router.refresh();
		});
	}

	function onDelete(category: AdminCategory) {
		const orphanMsg =
			category.productCount > 0
				? ` Produkty (${category.productCount}) stracą kategorię — trzeba przypisać od nowa.`
				: "";
		if (category.productCount > 0) {
			if (!window.confirm(`Kategoria „${category.name}" ma ${category.productCount} produktów.${orphanMsg} Usunąć mimo to?`)) return;
		} else if (!window.confirm(`Usunąć kategorię „${category.name}"?${orphanMsg}`)) {
			return;
		}

		startTransition(async () => {
			const result = await deleteCategoryAction(category.id);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			if (form.id === category.id) reset();
			router.refresh();
		});
	}

	function onDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = items.findIndex((item) => item.id === active.id);
		const newIndex = items.findIndex((item) => item.id === over.id);
		if (oldIndex < 0 || newIndex < 0) return;

		const next = arrayMove(items, oldIndex, newIndex);
		setItems(next);
		setError(null);

		startTransition(async () => {
			const result = await reorderCategoriesAction(next.map((item) => item.id));
			if (!result.ok) {
				setError(result.error);
				setItems(categories);
				return;
			}
			router.refresh();
		});
	}

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_340px]">
			<div className="overflow-hidden rounded-xl border border-border">
				{categories.length === 0 ? (
					<p className="p-8 text-center text-sm text-muted-foreground">Brak kategorii. Dodaj pierwszą po prawej.</p>
				) : (
					<>
						<p className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
							Przeciągnij kategorie, aby ustawić kolejność w filtrach sklepu i przy produkcie.
						</p>
						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
							<SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
								<ul className="divide-y divide-border">
									{items.map((category) => (
										<SortableCategoryRow
											key={category.id}
											category={category}
											pending={pending}
											onEdit={startEdit}
											onDelete={onDelete}
										/>
									))}
								</ul>
							</SortableContext>
						</DndContext>
					</>
				)}
			</div>

			<form onSubmit={onSubmit} className="flex h-fit flex-col gap-4 rounded-xl border border-border bg-card p-5">
				<div className="flex items-center justify-between">
					<h2 className="font-serif text-lg text-foreground">{isEditing ? "Edytuj kategorię" : "Nowa kategoria"}</h2>
					{isEditing ? (
						<button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
							<X className="size-3.5" aria-hidden />
							Anuluj
						</button>
					) : null}
				</div>

				<div className="flex flex-col gap-1.5">
					<label htmlFor="cat-name" className="text-sm font-medium">Nazwa</label>
					<Input
						id="cat-name"
						value={form.name}
						onChange={(e) => { setForm((prev) => ({ ...prev, name: e.target.value })); }}
						placeholder="np. Lampy"
						required
						className="h-10"
					/>
					{form.name.trim() ? <p className="text-xs text-muted-foreground">Adres: /{slugify(form.name)}</p> : null}
				</div>

				<div className="flex flex-col gap-1.5">
					<label htmlFor="cat-desc" className="text-sm font-medium">Opis (opcjonalnie)</label>
					<textarea
						id="cat-desc"
						value={form.description}
						onChange={(e) => { setForm((prev) => ({ ...prev, description: e.target.value })); }}
						rows={3}
						className={inputClass}
					/>
				</div>

				<label className="flex items-center gap-2.5 text-sm">
					<CheckboxInput
						checked={form.isActive}
						onChange={(isActive) => { setForm((prev) => ({ ...prev, isActive })); }}
						aria-label="Aktywna (widoczna w sklepie)"
					/>
					Aktywna (widoczna w sklepie)
				</label>

				{error ? (
					<p role="alert" className="text-sm text-destructive">{error}</p>
				) : null}

				<Button type="submit" size="lg" disabled={pending} className={cn("h-10 gap-1.5")}>
					{isEditing ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
					{pending ? "Zapisywanie…" : isEditing ? "Zapisz" : "Dodaj kategorię"}
				</Button>
			</form>
		</div>
	);
}
