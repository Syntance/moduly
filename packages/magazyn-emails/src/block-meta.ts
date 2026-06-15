import {
	Columns2,
	Heading,
	Image as ImageIcon,
	type LucideIcon,
	Minus,
	MousePointerClick,
	MoveVertical,
	PanelBottom,
	ShoppingBag,
	Type,
} from "lucide-react";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import type { Block, BlockType, LeafBlock } from "./template-types";

export const BLOCK_META: Record<BlockType, { label: string; icon: LucideIcon }> = {
	heading: { label: "Nagłówek", icon: Heading },
	text: { label: "Tekst", icon: Type },
	image: { label: "Obraz", icon: ImageIcon },
	button: { label: "Przycisk", icon: MousePointerClick },
	divider: { label: "Linia", icon: Minus },
	spacer: { label: "Odstęp", icon: MoveVertical },
	orderItems: { label: "Pozycje zamówienia", icon: ShoppingBag },
	footer: { label: "Stopka", icon: PanelBottom },
	columns: { label: "Dwie kolumny", icon: Columns2 },
};

/** Bloki dostępne w palecie (kolejność dodawania). */
export const PALETTE_BLOCKS: BlockType[] = [
	"heading",
	"text",
	"image",
	"button",
	"divider",
	"spacer",
	"columns",
	"orderItems",
	"footer",
];

/** Bloki dozwolone wewnątrz kolumn. */
export const LEAF_PALETTE: LeafBlock["type"][] = [
	"heading",
	"text",
	"image",
	"button",
	"divider",
	"spacer",
];

function uid(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `b_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Tworzy nowy blok danego typu z sensownymi wartościami domyślnymi. */
export function createBlock(type: BlockType): Block {
	const id = uid();
	switch (type) {
		case "heading":
			return { id, type, text: "Nagłówek", level: 2, style: { bold: true, fontSize: 18, align: "left", paddingY: 8, fontKey: "gilroy" } };
		case "text":
			return {
				id,
				type,
				text: "Nowy akapit. Wstaw dane przez {{imie}} lub {{nrZamowienia}}.",
				style: {
					fontSize: 14,
					align: "left",
					paddingY: 6,
					color: getModulyConfig().emailTheme.text,
					fontKey: "gilroy",
				},
			};
		case "image":
			return { id, type, src: "", alt: "", width: 280, align: "center", paddingY: 8 };
		case "button":
			return {
				id,
				type,
				label: "Zobacz",
				href: getModulyConfig().email.siteUrl,
				align: "left",
				radius: 8,
				paddingY: 10,
			};
		case "divider":
			return { id, type, paddingY: 10 };
		case "spacer":
			return { id, type, height: 24 };
		case "orderItems":
			return { id, type, showThumbnails: false, showTotal: true, style: { fontSize: 14, paddingY: 12 } };
		case "footer":
			return { id, type, text: getModulyConfig().email.footerText, style: { fontSize: 11, align: "left", paddingY: 4 } };
		case "columns":
			return { id, type, left: [], right: [], gap: 16, paddingY: 8 };
	}
}

export function duplicateBlock(block: Block): Block {
	return { ...structuredClone(block), id: uid() };
}
