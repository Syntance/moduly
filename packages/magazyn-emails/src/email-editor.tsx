"use client";

import { Loader2, Monitor, Plus, Redo2, RotateCcw, Save, Send, Smartphone, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@moduly/ui";
import { Input } from "@moduly/ui";
import { cn } from "@moduly/ui";
import { renderTemplate, sampleRenderContextForTemplate } from "./render-template";
import {
	type Block,
	type EmailTemplate,
	type EmailTemplateType,
	getClientTemplateType,
	getInternalTemplateType,
	getMergeVariablesForTemplate,
	isContactEmailTemplateType,
	isEmailTemplateEnabled,
	isInternalAudienceType,
} from "./template-types";
import {
	resetTemplateAction,
	saveTemplateAction,
	sendTestEmailAction,
	setTemplateEnabledAction,
	uploadEmailImageAction,
} from "./actions";
import { createBlock, duplicateBlock } from "./block-meta";
import { AddBlockCallout } from "./add-block-callout";
import { BlockInspector, type ImageUploader } from "./block-inspector";
import { editorBtnRounded, segmentItem, segmentItemActive, segmentItemIdle, segmentTrack } from "./editor-chrome";
import { EditorCanvas } from "./editor-canvas";
import { EmailTemplatePicker, enabledByTypeFromTemplates } from "./email-template-picker";
import { ThemePanel } from "./theme-panel";
import { useTemplateHistory } from "./use-template-history";

type Feedback = { type: "ok" | "err"; text: string } | null;

function toRecord(templates: EmailTemplate[]): Record<EmailTemplateType, EmailTemplate> {
	const record = {} as Record<EmailTemplateType, EmailTemplate>;
	for (const template of templates) record[template.type] = template;
	return record;
}

export function EmailEditor({
	initialTemplates,
	initialType,
	hideTemplatePicker = false,
}: {
	initialTemplates: EmailTemplate[];
	initialType?: EmailTemplateType;
	hideTemplatePicker?: boolean;
}) {
	const [templates, setTemplates] = useState(() => toRecord(initialTemplates));
	const [activeType, setActiveType] = useState<EmailTemplateType>(
		initialType ?? initialTemplates[0]?.type ?? "placed",
	);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [leftPanelTab, setLeftPanelTab] = useState<"block" | "theme">("block");
	const [addBlockOpen, setAddBlockOpen] = useState(false);
	const addBlockAnchorRef = useRef<HTMLButtonElement>(null);
	const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
	const [testEmail, setTestEmail] = useState("");
	const [feedback, setFeedback] = useState<Feedback>(null);
	const [saving, startSave] = useTransition();
	const [resetting, startReset] = useTransition();
	const [testing, startTest] = useTransition();
	const [togglingType, setTogglingType] = useState<EmailTemplateType | null>(null);
	const history = useTemplateHistory();

	const active = templates[activeType];
	const activeEnabled = isEmailTemplateEnabled(active);

	const templateList = useMemo(() => Object.values(templates), [templates]);
	const enabledByType = useMemo(() => enabledByTypeFromTemplates(templateList), [templateList]);

	const selectedBlock = useMemo(
		() => active.blocks.find((b) => b.id === selectedId) ?? null,
		[active.blocks, selectedId],
	);

	const mergeVariables = useMemo(() => getMergeVariablesForTemplate(activeType), [activeType]);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 1280px)");
		setPreviewMode(mq.matches ? "desktop" : "mobile");
	}, []);

	const preview = useMemo(
		() => renderTemplate(active, sampleRenderContextForTemplate(activeType)).html,
		[active, activeType],
	);

	function updateActive(
		updater: (t: EmailTemplate) => EmailTemplate,
		options?: { skipHistory?: boolean },
	) {
		setTemplates((prev) => {
			const current = prev[activeType];
			if (!options?.skipHistory) {
				history.recordBeforeChange(activeType, current);
			}
			return { ...prev, [activeType]: updater(current) };
		});
	}

	const onUndo = useCallback(() => {
		setTemplates((prev) => {
			const current = prev[activeType];
			const previous = history.undo(activeType, current);
			if (!previous) return prev;
			return { ...prev, [activeType]: previous };
		});
		setFeedback(null);
	}, [activeType, history]);

	const onRedo = useCallback(() => {
		setTemplates((prev) => {
			const current = prev[activeType];
			const next = history.redo(activeType, current);
			if (!next) return prev;
			return { ...prev, [activeType]: next };
		});
		setFeedback(null);
	}, [activeType, history]);

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (!(event.ctrlKey || event.metaKey)) return;

			const key = event.key.toLowerCase();
			const isUndo = key === "z" && !event.shiftKey;
			const isRedo = key === "r" || (key === "z" && event.shiftKey) || key === "y";

			if (!isUndo && !isRedo) return;

			if (isUndo) {
				if (!history.canUndo(activeType)) return;
				event.preventDefault();
				onUndo();
				return;
			}

			if (!history.canRedo(activeType)) return;
			event.preventDefault();
			onRedo();
		}

		window.addEventListener("keydown", onKeyDown);
		return () => { window.removeEventListener("keydown", onKeyDown); };
	}, [activeType, history, onUndo, onRedo]);

	const canUndo = history.canUndo(activeType);
	const canRedo = history.canRedo(activeType);

	function setBlocks(blocks: Block[]) {
		updateActive((t) => ({ ...t, blocks }));
	}

	function selectBlock(id: string) {
		setSelectedId(id);
		setLeftPanelTab("block");
	}

	function addBlock(type: Block["type"]) {
		const block = createBlock(type);
		updateActive((t) => {
			const blocks = [...t.blocks];
			if (selectedId) {
				const index = blocks.findIndex((b) => b.id === selectedId);
				if (index >= 0) {
					blocks.splice(index + 1, 0, block);
					return { ...t, blocks };
				}
			}
			return { ...t, blocks: [...blocks, block] };
		});
		selectBlock(block.id);
		setAddBlockOpen(false);
	}

	function updateBlock(id: string, next: Block) {
		updateActive((t) => ({ ...t, blocks: t.blocks.map((b) => (b.id === id ? next : b)) }));
	}

	function onDuplicate(id: string) {
		const source = active.blocks.find((b) => b.id === id);
		if (!source) return;
		const copy = duplicateBlock(source);
		const index = active.blocks.findIndex((b) => b.id === id);
		const blocks = [...active.blocks];
		blocks.splice(index + 1, 0, copy);
		setBlocks(blocks);
		selectBlock(copy.id);
	}

	function onDelete(id: string) {
		updateActive((t) => ({ ...t, blocks: t.blocks.filter((b) => b.id !== id) }));
		if (selectedId === id) setSelectedId(null);
	}

	const switchTemplate = useCallback((type: EmailTemplateType) => {
		setActiveType(type);
		setSelectedId(null);
		setLeftPanelTab("block");
		setAddBlockOpen(false);
		setFeedback(null);
	}, []);

	const switchAudience = useCallback(
		(audience: "client" | "internal") => {
			const base = getClientTemplateType(activeType);
			const nextType =
				audience === "internal" ? getInternalTemplateType(base) : base;
			if (nextType === activeType) return;
			switchTemplate(nextType);
		},
		[activeType, switchTemplate],
	);

	const onToggleEnabled = useCallback((type: EmailTemplateType, enabled: boolean) => {
		setFeedback(null);
		setTogglingType(type);
		void (async () => {
			const result = await setTemplateEnabledAction({ type, enabled });
			setTogglingType(null);
			if (result.ok && result.template) {
				setTemplates((prev) => ({
					...prev,
					[type]: result.template as EmailTemplate,
				}));
				history.clear(type);
				setFeedback({
					type: "ok",
					text: enabled
						? "Wysyłka tego e-maila włączona."
						: "Wysyłka tego e-maila wyłączona — klient nie dostanie go automatycznie.",
				});
			} else {
				setFeedback({
					type: "err",
					text: result.error ?? "Nie udało się zapisać ustawienia.",
				});
			}
		})();
	}, [history]);

	const uploadImage: ImageUploader = async (file) => {
		const formData = new FormData();
		formData.append("file", file);
		const result = await uploadEmailImageAction(formData);
		return result.ok ? { url: result.url } : { error: result.error ?? "Błąd uploadu." };
	};

	function onSave() {
		setFeedback(null);
		startSave(async () => {
			const result = await saveTemplateAction({
				...active,
				enabled: active.enabled ?? true,
			});
			setFeedback(
				result.ok
					? { type: "ok", text: "Szablon zapisany — nadpisze wysyłki tego etapu." }
					: { type: "err", text: result.error ?? "Nie udało się zapisać." },
			);
		});
	}

	function onReset() {
		if (!window.confirm("Przywrócić domyślny szablon? Twoje zmiany tego maila zostaną usunięte.")) return;
		setFeedback(null);
		startReset(async () => {
			const result = await resetTemplateAction(activeType);
			if (result.ok && result.template) {
				setTemplates((prev) => ({ ...prev, [activeType]: result.template as EmailTemplate }));
				history.clear(activeType);
				setSelectedId(null);
				setFeedback({ type: "ok", text: "Przywrócono domyślny szablon." });
			} else {
				setFeedback({ type: "err", text: result.error ?? "Nie udało się przywrócić." });
			}
		});
	}

	function onTest() {
		setFeedback(null);
		startTest(async () => {
			const result = await sendTestEmailAction({ to: testEmail, template: active });
			setFeedback(
				result.ok
					? { type: "ok", text: `Wysłano test na ${testEmail}.` }
					: { type: "err", text: result.error ?? "Nie udało się wysłać testu." },
			);
		});
	}

	function insertVariable(token: string) {
		updateActive((t) => ({ ...t, subject: `${t.subject}{{${token}}}` }));
	}

	const busy = saving || resetting || testing || togglingType !== null;

	const previewMaxWidth = previewMode === "mobile" ? 390 : (active.theme.contentWidth + 80) * 2;

	return (
		<div className="flex flex-col gap-4">
			{hideTemplatePicker ? null : (
				<EmailTemplatePicker
					activeType={activeType}
					onSelect={switchTemplate}
					enabledByType={enabledByType}
					onToggleEnabled={onToggleEnabled}
					togglingType={togglingType}
				/>
			)}

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground">
					Edytujesz wersję maila dla{" "}
					<strong className="text-foreground">
						{isInternalAudienceType(activeType) ? "sklepu (kontakt@lumineconcept.pl)" : "klienta"}
					</strong>
					.
				</p>
				<div className={cn(segmentTrack, "w-fit shrink-0")}>
					<button
						type="button"
						aria-pressed={!isInternalAudienceType(activeType)}
						onClick={() => { switchAudience("client"); }}
						className={cn(
							"px-3 py-1.5 text-sm font-medium whitespace-nowrap",
							segmentItem,
							!isInternalAudienceType(activeType) ? segmentItemActive : segmentItemIdle,
						)}
					>
						Do klienta
					</button>
					<button
						type="button"
						aria-pressed={isInternalAudienceType(activeType)}
						onClick={() => { switchAudience("internal"); }}
						className={cn(
							"px-3 py-1.5 text-sm font-medium whitespace-nowrap",
							segmentItem,
							isInternalAudienceType(activeType) ? segmentItemActive : segmentItemIdle,
						)}
					>
						Do nas
					</button>
				</div>
			</div>

			{!activeEnabled ? (
				<p
					role="status"
					className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground"
				>
					Wysyłka automatyczna wyłączona dla tego szablonu. Możesz edytować treść i włączyć ją suwakiem w
					liście powyżej.
				</p>
			) : null}

			<div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
				<div className="flex flex-col gap-1.5">
					<label htmlFor="email-subject" className="text-sm font-medium">
						Temat wiadomości
					</label>
					<Input
						id="email-subject"
						value={active.subject}
						onChange={(e) => { updateActive((t) => ({ ...t, subject: e.target.value })); }}
						className="h-10"
					/>
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-xs text-muted-foreground">Wstaw zmienną:</span>
					{mergeVariables.map((v) => (
						<button
							key={v.token}
							type="button"
							onClick={() => { insertVariable(v.token); }}
							title={v.label}
							className={cn(
								editorBtnRounded,
								"border border-input px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
							)}
						>
							{`{{${v.token}}}`}
						</button>
					))}
				</div>

				<div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
					<div className="flex w-full min-w-0 items-center gap-2 sm:flex-1 sm:max-w-md">
						<Input
							type="email"
							value={testEmail}
							onChange={(e) => { setTestEmail(e.target.value); }}
							placeholder="adres@do-testu.pl"
							className="h-9 min-w-0 flex-1"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={busy || !testEmail.includes("@")}
							onClick={onTest}
							className="gap-1.5"
						>
							{testing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
							Wyślij test
						</Button>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={busy || !canUndo}
							onClick={onUndo}
							className="gap-1.5"
							title="Cofnij (Ctrl+Z)"
						>
							<Undo2 className="size-4" aria-hidden />
							Cofnij
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={busy || !canRedo}
							onClick={onRedo}
							className="gap-1.5"
							title="Ponów (Ctrl+R)"
						>
							<Redo2 className="size-4" aria-hidden />
							Ponów
						</Button>
						<Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onReset} className="gap-1.5">
							{resetting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
							Przywróć domyślny
						</Button>
						<Button type="button" size="sm" disabled={busy} onClick={onSave} className="gap-1.5">
							{saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
							Zapisz
						</Button>
					</div>
				</div>

				{feedback ? (
					<p
						role={feedback.type === "err" ? "alert" : "status"}
						className={cn("text-sm", feedback.type === "err" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}
					>
						{feedback.text}
					</p>
				) : null}
			</div>

			<div
				className={cn(
					"flex flex-col gap-4",
					"xl:grid xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:grid-rows-[auto_minmax(0,1fr)] xl:items-start",
				)}
			>
				<div className="order-1 min-w-0 rounded-xl border border-border bg-card p-3 xl:col-start-1 xl:row-start-2">
					<div className="relative mb-2 flex items-center justify-between">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Bloki ({active.blocks.length})
						</h3>
						<button
							ref={addBlockAnchorRef}
							type="button"
							aria-label="Dodaj sekcję"
							aria-expanded={addBlockOpen}
							onClick={() => { setAddBlockOpen((open) => !open); }}
							className={cn(
								editorBtnRounded,
								"inline-flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
								addBlockOpen && "bg-muted text-foreground",
							)}
						>
							<Plus className="size-4" aria-hidden />
						</button>
						<AddBlockCallout
							open={addBlockOpen}
							onClose={() => { setAddBlockOpen(false); }}
							onAdd={addBlock}
							anchorRef={addBlockAnchorRef}
						/>
					</div>
					<EditorCanvas
						blocks={active.blocks}
						selectedId={selectedId}
						onSelect={selectBlock}
						onReorder={setBlocks}
						onDuplicate={onDuplicate}
						onDelete={onDelete}
					/>
				</div>

				<div className="order-3 min-w-0 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 xl:col-start-1 xl:row-start-1">
					<div className={cn(segmentTrack, "w-full")}>
						<button
							type="button"
							onClick={() => { setLeftPanelTab("block"); }}
							aria-pressed={leftPanelTab === "block"}
							className={cn(
								"flex-1 px-3 py-1.5 text-sm font-medium",
								segmentItem,
								leftPanelTab === "block" ? segmentItemActive : segmentItemIdle,
							)}
						>
							Blok
						</button>
						<button
							type="button"
							onClick={() => { setLeftPanelTab("theme"); }}
							aria-pressed={leftPanelTab === "theme"}
							className={cn(
								"flex-1 px-3 py-1.5 text-sm font-medium",
								segmentItem,
								leftPanelTab === "theme" ? segmentItemActive : segmentItemIdle,
							)}
						>
							Motyw
						</button>
					</div>

					{leftPanelTab === "theme" ? (
						<ThemePanel theme={active.theme} onChange={(theme) => { updateActive((t) => ({ ...t, theme })); }} />
					) : selectedBlock ? (
						<BlockInspector block={selectedBlock} onUpload={uploadImage} onChange={(next) => { updateBlock(selectedBlock.id, next); }} />
					) : (
						<p className="text-sm text-muted-foreground">
							Zaznacz blok na liście powyżej, aby edytować treść i styl.
						</p>
					)}
				</div>

				<div className="order-2 flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 xl:col-start-2 xl:row-span-2 xl:row-start-1">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Podgląd (
							{isContactEmailTemplateType(activeType)
								? "przykładowy formularz"
								: activeType === "bank_transfer_pending"
									? "przelew tradycyjny"
									: activeType === "payment_failed"
										? "nieudana płatność online"
										: "przykładowe zamówienie"}
							)
						</h3>
						<div className={segmentTrack}>
							<button
								type="button"
								aria-label="Podgląd desktop"
								aria-pressed={previewMode === "desktop"}
								onClick={() => { setPreviewMode("desktop"); }}
								className={cn(
									"inline-flex size-7 items-center justify-center",
									segmentItem,
									previewMode === "desktop" ? segmentItemActive : segmentItemIdle,
								)}
							>
								<Monitor className="size-4" aria-hidden />
							</button>
							<button
								type="button"
								aria-label="Podgląd mobilny"
								aria-pressed={previewMode === "mobile"}
								onClick={() => { setPreviewMode("mobile"); }}
								className={cn(
									"inline-flex size-7 items-center justify-center",
									segmentItem,
									previewMode === "mobile" ? segmentItemActive : segmentItemIdle,
								)}
							>
								<Smartphone className="size-4" aria-hidden />
							</button>
						</div>
					</div>
					<div className="w-full min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
						<iframe
							title="Podgląd maila"
							srcDoc={preview}
							sandbox=""
							className="h-[min(480px,52vh)] w-full rounded-lg border border-border bg-white transition-all xl:h-[min(720px,70vh)]"
							style={
								previewMode === "desktop"
									? { width: "100%", maxWidth: previewMaxWidth }
									: { width: "100%", maxWidth: "100%" }
							}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
