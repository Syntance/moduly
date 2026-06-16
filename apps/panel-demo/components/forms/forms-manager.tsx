"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { Button, Input, Switch } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  CONTACT_TEMPLATE_VARS,
  type FormPreset,
  type FormsConfig,
  type FormTopic,
} from "@/lib/forms-data";

type Props = {
  initialConfig: FormsConfig;
};

export function FormsManager({ initialConfig }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [activeId, setActiveId] = useState(initialConfig.forms[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newTopicValue, setNewTopicValue] = useState("");
  const [newTopicLabel, setNewTopicLabel] = useState("");

  const activeForm = config.forms.find((f) => f.id === activeId) ?? config.forms[0];

  function updateForm(id: string, patch: Partial<FormPreset>) {
    setSaved(false);
    setConfig((prev) => ({
      forms: prev.forms.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }

  function normalizeTopicValue(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 48);
  }

  function addTopic(formId: string) {
    const value = normalizeTopicValue(newTopicValue || newTopicLabel);
    const label = newTopicLabel.trim() || newTopicValue.trim();
    if (!value || !label) {
      setError("Podaj wartość (slug) i etykietę nowego tematu.");
      return;
    }
    const form = config.forms.find((f) => f.id === formId);
    if (form?.topics.some((t) => t.value === value)) {
      setError("Temat o takiej wartości już istnieje.");
      return;
    }
    setError(null);
    setSaved(false);
    setConfig((prev) => ({
      forms: prev.forms.map((f) =>
        f.id === formId ? { ...f, topics: [...f.topics, { value, label, enabled: true }] } : f,
      ),
    }));
    setNewTopicValue("");
    setNewTopicLabel("");
  }

  function removeTopic(formId: string, topicValue: string) {
    const form = config.forms.find((f) => f.id === formId);
    if (!form || form.topics.length <= 1) {
      setError("Formularz musi mieć co najmniej jeden temat.");
      return;
    }
    setError(null);
    setSaved(false);
    setConfig((prev) => ({
      forms: prev.forms.map((f) =>
        f.id === formId ? { ...f, topics: f.topics.filter((t) => t.value !== topicValue) } : f,
      ),
    }));
  }

  function updateTopic(formId: string, topicValue: string, patch: Partial<FormTopic>) {
    setSaved(false);
    setConfig((prev) => ({
      forms: prev.forms.map((f) => {
        if (f.id !== formId) return f;
        return {
          ...f,
          topics: f.topics.map((t) => (t.value === topicValue ? { ...t, ...patch } : t)),
        };
      }),
    }));
  }

  function onSave() {
    setError(null);
    setSaved(true);
  }

  if (!activeForm) {
    return <p className="text-sm text-muted-foreground">Brak formularzy w konfiguracji.</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <nav className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2">
        {config.forms.map((form) => (
          <button
            key={form.id}
            type="button"
            onClick={() => setActiveId(form.id)}
            className={cn(
              "rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              activeId === form.id
                ? "bg-primary/10 font-medium text-foreground"
                : "text-foreground/80 hover:bg-muted/60",
            )}
          >
            <span className="block">{form.name}</span>
            <span className="mt-0.5 block font-mono text-[0.65rem] text-muted-foreground">{form.id}</span>
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-foreground">{activeForm.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Id preset: <code className="font-mono text-xs">{activeForm.id}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`form-enabled-${activeForm.id}`}
              checked={activeForm.enabled}
              onCheckedChange={(enabled) => updateForm(activeForm.id, { enabled })}
            />
            <label htmlFor={`form-enabled-${activeForm.id}`} className="text-sm">
              Formularz włączony
            </label>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Nazwa w magazynie</span>
            <Input
              value={activeForm.name}
              onChange={(e) => updateForm(activeForm.id, { name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">E-mail odbiorcy (zespół)</span>
            <Input
              type="email"
              value={activeForm.recipientEmail}
              onChange={(e) => updateForm(activeForm.id, { recipientEmail: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
            <span className="font-medium text-foreground">Podstrony (ścieżki, po przecinku)</span>
            <Input
              value={activeForm.pages.join(", ")}
              onChange={(e) =>
                updateForm(activeForm.id, {
                  pages: e.target.value
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean),
                })
              }
              placeholder="/regulamin, /polityka-prywatnosci"
            />
          </label>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Tematy w polu wyboru</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Wartość (value) służy analityce — nie zmieniaj bez potrzeby.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {activeForm.topics.map((topic) => (
              <li
                key={topic.value}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
              >
                <code className="shrink-0 rounded bg-primary/10 px-2 py-1 font-mono text-[0.65rem] text-primary">
                  {topic.value}
                </code>
                <Input
                  className="flex-1"
                  value={topic.label}
                  onChange={(e) => updateTopic(activeForm.id, topic.value, { label: e.target.value })}
                />
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <Switch
                    id={`topic-${activeForm.id}-${topic.value}`}
                    checked={topic.enabled}
                    onCheckedChange={(enabled) => updateTopic(activeForm.id, topic.value, { enabled })}
                  />
                  <label
                    htmlFor={`topic-${activeForm.id}-${topic.value}`}
                    className="text-sm text-muted-foreground"
                  >
                    Widoczny
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeTopic(activeForm.id, topic.value)}
                    aria-label={`Usuń temat ${topic.label}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Wartość (slug)</span>
                <Input
                  value={newTopicValue}
                  onChange={(e) => setNewTopicValue(e.target.value)}
                  placeholder="np. wysylka"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Etykieta w polu wyboru</span>
                <Input
                  value={newTopicLabel}
                  onChange={(e) => setNewTopicLabel(e.target.value)}
                  placeholder="np. Pytanie o dostawę"
                />
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-3 gap-1.5"
              onClick={() => addTopic(activeForm.id)}
            >
              <Plus className="size-4" aria-hidden />
              Dodaj temat
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Mail className="size-4 text-primary" aria-hidden />
            Potwierdzenie dla klienta
          </p>
          <p className="mt-2 leading-relaxed text-foreground/80">
            Jeden szablon dla wszystkich formularzy — edytujesz go w{" "}
            <Link href="/magazyn/maile" className="font-semibold text-primary underline underline-offset-4">
              E-maile → Formularze
            </Link>
            . Zmienne w szablonie:{" "}
            {CONTACT_TEMPLATE_VARS.map((v, i) => (
              <span key={v}>
                <code className="font-mono text-xs">{v}</code>
                {i < CONTACT_TEMPLATE_VARS.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {saved ? (
          <p role="status" className="text-sm text-emerald-700">
            Konfiguracja zapisana (demo).
          </p>
        ) : null}

        <Button type="button" onClick={onSave}>
          Zapisz konfigurację
        </Button>
      </div>
    </div>
  );
}
