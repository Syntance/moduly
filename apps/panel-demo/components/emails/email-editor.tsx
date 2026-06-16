"use client";

import { useState } from "react";
import {
  Copy,
  GripVertical,
  Heading,
  Monitor,
  MoveVertical,
  PanelBottom,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Send,
  ShoppingBag,
  Smartphone,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  buildEmailPreviewHtml,
  MERGE_VARIABLES,
  type EmailBlock,
  type MailDemo,
} from "@/lib/email-data";

const segmentTrack = "inline-flex rounded-lg border border-input p-0.5";
const segmentItem = "rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
const segmentActive = "bg-primary text-primary-foreground";
const segmentIdle = "text-muted-foreground hover:bg-muted";

const BLOCK_ICONS = {
  heading: Heading,
  text: Type,
  spacer: MoveVertical,
  orderItems: ShoppingBag,
  footer: PanelBottom,
} as const;

type Props = {
  mail: MailDemo;
};

export function EmailEditor({ mail }: Props) {
  const [subject, setSubject] = useState(mail.subject);
  const [audience, setAudience] = useState<"client" | "internal">("client");
  const [selectedId, setSelectedId] = useState<string | null>(mail.blocks[0]?.id ?? null);
  const [leftTab, setLeftTab] = useState<"block" | "theme">("block");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [testEmail, setTestEmail] = useState("");

  const selected = mail.blocks.find((b) => b.id === selectedId) ?? null;
  const previewHtml = buildEmailPreviewHtml();

  return (
    <div className="flex flex-col gap-4">
      {mail.hasInternalVersion ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Edytujesz wersję maila dla{" "}
            <strong className="text-foreground">
              {audience === "internal" ? "sklepu (sklep@outdoorstore.pl)" : "klienta"}
            </strong>
            .
          </p>
          <div className={cn(segmentTrack, "w-fit shrink-0")}>
            <button
              type="button"
              aria-pressed={audience === "client"}
              onClick={() => setAudience("client")}
              className={cn("px-3 py-1.5 text-sm font-medium whitespace-nowrap", segmentItem, audience === "client" ? segmentActive : segmentIdle)}
            >
              Do klienta
            </button>
            <button
              type="button"
              aria-pressed={audience === "internal"}
              onClick={() => setAudience("internal")}
              className={cn("px-3 py-1.5 text-sm font-medium whitespace-nowrap", segmentItem, audience === "internal" ? segmentActive : segmentIdle)}
            >
              Do nas
            </button>
          </div>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email-subject" className="text-sm font-medium">Temat wiadomości</label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Wstaw zmienną:</span>
          {MERGE_VARIABLES.map((v) => (
            <button
              key={v.token}
              type="button"
              title={v.label}
              onClick={() => setSubject((s) => `${s}{{${v.token}}}`)}
              className="rounded-lg border border-input px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {`{{${v.token}}}`}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex w-full min-w-0 items-center gap-2 sm:max-w-md sm:flex-1">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="adres@do-testu.pl"
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0">
              <Send className="size-4" aria-hidden />
              Wyślij test
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5">
              <Undo2 className="size-4" aria-hidden />
              Cofnij
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-1.5">
              <Redo2 className="size-4" aria-hidden />
              Ponów
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-1.5">
              <RotateCcw className="size-4" aria-hidden />
              Przywróć domyślny
            </Button>
            <Button type="button" size="sm" className="gap-1.5">
              <Save className="size-4" aria-hidden />
              Zapisz
            </Button>
          </div>
        </div>
      </div>

      {/* Edytor + podgląd */}
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:grid-rows-[auto_minmax(0,1fr)] xl:items-start">
        {/* Lista bloków */}
        <div className="order-1 min-w-0 rounded-xl border border-border bg-card p-3 xl:col-start-1 xl:row-start-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bloki ({mail.blocks.length})
            </h3>
            <button
              type="button"
              aria-label="Dodaj sekcję"
              className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {mail.blocks.map((block) => (
              <BlockRow
                key={block.id}
                block={block}
                selected={selectedId === block.id}
                onSelect={() => {
                  setSelectedId(block.id);
                  setLeftTab("block");
                }}
              />
            ))}
          </ul>
        </div>

        {/* Inspektor bloku / motyw */}
        <div className="order-3 min-w-0 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 xl:col-start-1 xl:row-start-1">
          <div className={cn(segmentTrack, "w-full")}>
            <button
              type="button"
              aria-pressed={leftTab === "block"}
              onClick={() => setLeftTab("block")}
              className={cn("flex-1 px-3 py-1.5 text-sm font-medium", segmentItem, leftTab === "block" ? segmentActive : segmentIdle)}
            >
              Blok
            </button>
            <button
              type="button"
              aria-pressed={leftTab === "theme"}
              onClick={() => setLeftTab("theme")}
              className={cn("flex-1 px-3 py-1.5 text-sm font-medium", segmentItem, leftTab === "theme" ? segmentActive : segmentIdle)}
            >
              Motyw
            </button>
          </div>

          {leftTab === "theme" ? (
            <ThemePanel />
          ) : selected ? (
            <BlockInspector block={selected} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Zaznacz blok na liście powyżej, aby edytować treść i styl.
            </p>
          )}
        </div>

        {/* Podgląd */}
        <div className="order-2 flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Podgląd (przykładowe zamówienie)
            </h3>
            <div className={segmentTrack}>
              <button
                type="button"
                aria-label="Podgląd desktop"
                aria-pressed={previewMode === "desktop"}
                onClick={() => setPreviewMode("desktop")}
                className={cn("inline-flex size-7 items-center justify-center", segmentItem, previewMode === "desktop" ? segmentActive : segmentIdle)}
              >
                <Monitor className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Podgląd mobilny"
                aria-pressed={previewMode === "mobile"}
                onClick={() => setPreviewMode("mobile")}
                className={cn("inline-flex size-7 items-center justify-center", segmentItem, previewMode === "mobile" ? segmentActive : segmentIdle)}
              >
                <Smartphone className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto">
            <iframe
              title="Podgląd maila"
              srcDoc={previewHtml}
              sandbox=""
              className={cn(
                "h-[min(480px,52vh)] w-full rounded-lg border border-border bg-white xl:h-[min(720px,70vh)]",
                previewMode === "mobile" ? "mx-auto max-w-[390px]" : "max-w-full",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockRow({
  block,
  selected,
  onSelect,
}: {
  block: EmailBlock;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = BLOCK_ICONS[block.type];

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-2 py-2 transition-colors",
        selected ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-foreground/30",
      )}
    >
      <button
        type="button"
        aria-label="Przeciągnij, aby zmienić kolejność"
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-foreground">{block.label}</span>
          <span className="block truncate text-xs text-muted-foreground">{block.snippet}</span>
        </span>
      </button>
      <button type="button" aria-label="Duplikuj blok" className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
        <Copy className="size-3.5" aria-hidden />
      </button>
      <button type="button" aria-label="Usuń blok" className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}

function BlockInspector({ block }: { block: EmailBlock }) {
  const inputClass =
    "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  if (block.type === "spacer") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Wysokość odstępu (px)</label>
        <input type="number" defaultValue={24} className={`h-9 ${inputClass}`} />
      </div>
    );
  }

  if (block.type === "orderItems") {
    return (
      <p className="text-sm text-muted-foreground">
        Blok listy pozycji zamówienia — generowany automatycznie z danych zamówienia.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Treść</label>
        <textarea rows={4} defaultValue={block.snippet} className={inputClass} />
      </div>
      {block.type === "heading" ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Poziom nagłówka</label>
          <select className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none">
            <option>H1</option>
            <option>H2</option>
            <option>H3</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}

function ThemePanel() {
  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Nazwa marki w nagłówku</label>
        <input type="text" defaultValue="Outdoor Store" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Kolor akcentu</label>
          <input type="text" defaultValue="#AF7C61" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nagłówek maila</label>
          <input type="text" defaultValue="#725750" className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Szerokość treści (px)</label>
        <input type="number" defaultValue={560} className={inputClass} />
      </div>
    </div>
  );
}
