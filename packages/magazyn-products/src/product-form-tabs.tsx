"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@moduly/ui";

type TabId = "basic" | "images" | "seo";

type TabDef = { id: TabId; label: string };

const BASIC_TAB: TabDef = { id: "basic", label: "Podstawowe" };
const IMAGES_TAB: TabDef = { id: "images", label: "Zdjęcia" };
const SEO_TAB: TabDef = { id: "seo", label: "SEO i treści" };

const TABS: TabDef[] = [BASIC_TAB, IMAGES_TAB, SEO_TAB];

type Props = {
	basicPanel: ReactNode;
	imagesPanel: ReactNode;
	seoPanel: ReactNode;
};

export function ProductFormTabs({ basicPanel, imagesPanel, seoPanel }: Props) {
	const baseId = useId();
	const [activeTab, setActiveTab] = useState<TabId>("basic");

	function panelForTab(id: TabId): ReactNode {
		switch (id) {
			case "basic":
				return basicPanel;
			case "images":
				return imagesPanel;
			case "seo":
				return seoPanel;
		}
	}

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card">
			<div
				role="tablist"
				aria-label="Edycja produktu"
				className="flex border-b border-border bg-muted/20"
			>
				{TABS.map((tab) => {
					const selected = activeTab === tab.id;
					const tabId = `${baseId}-${tab.id}`;
					const panelId = `${baseId}-${tab.id}-panel`;

					return (
						<button
							key={tab.id}
							type="button"
							id={tabId}
							role="tab"
							aria-selected={selected}
							aria-controls={panelId}
							onClick={() => { setActiveTab(tab.id); }}
							className={cn(
								"relative flex min-h-11 flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors outline-none",
								"focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
								selected
									? "bg-card text-foreground"
									: "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
							)}
						>
							{tab.label}
							{selected ? (
								<span
									aria-hidden
									className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
								/>
							) : null}
						</button>
					);
				})}
			</div>

			{TABS.map((tab) => {
				const selected = activeTab === tab.id;
				const tabId = `${baseId}-${tab.id}`;
				const panelId = `${baseId}-${tab.id}-panel`;

				return (
					<div
						key={tab.id}
						id={panelId}
						role="tabpanel"
						aria-labelledby={tabId}
						hidden={!selected}
						className="p-5"
					>
						{panelForTab(tab.id)}
					</div>
				);
			})}
		</div>
	);
}
