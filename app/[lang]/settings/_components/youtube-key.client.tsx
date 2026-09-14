"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// ФОРМА КЛЮЧА YOUTUBE (195-4).
//
// 🔒 КЛЮЧ УХОДИТ НА СЕРВЕР И БОЛЬШЕ НЕ ПОЯВЛЯЕТСЯ НА ЭКРАНЕ: поле очищается после записи, обратно приходит только признак «задан» и четыре
// последних знака. Так же устроены карточки ключей OpenAI и Anthropic.
// 🔒 ПОСЛЕ ЗАПИСИ СРАЗУ ЖИВАЯ ПРОВЕРКА У GOOGLE: «сохранено» без проверки означало бы «строка записана», а не «ключ работает».

export type YoutubeKeyWords = {
  keyLabel: string;
  keyPlaceholder: string;
  keyReplace: string;
  save: string;
  saving: string;
  saved: string;
  check: string;
  checking: string;
  valid: string;
  errors: Record<string, string>;
};

export function YoutubeKeyForm({ configured, words }: { configured: boolean; words: YoutubeKeyWords }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [bad, setBad] = useState<string | null>(null);

  const say = (r: { error?: string; ok?: boolean; title?: string; why?: string }) => {
    if (r.ok) {
      setBad(null);
      setNote(r.title ? `${words.valid} «${r.title}»` : words.saved);
      return;
    }
    setNote(null);
    setBad(`${words.errors[String(r.error)] ?? words.errors.refused}${r.why ? ` — ${r.why}` : ""}`);
  };

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch("/api/fractera/youtube-key", {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const j = (await r.json().catch(() => ({}))) as { check?: { error?: string; ok?: boolean; title?: string; why?: string }; error?: string; ok?: boolean; title?: string; why?: string };
      if (body.key) {
        if (!r.ok || !j.ok) say({ error: j.error, why: j.why });
        else {
          setKey("");
          say(j.check ?? { ok: true });
        }
        return;
      }
      say(j);
    } catch (e) {
      say({ error: "unreachable", why: String((e as Error).message) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3" data-youtube-key-form="">
      <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="yt-key">
        {configured ? words.keyReplace : words.keyLabel}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          autoComplete="off"
          className="min-w-64 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-[length:var(--fs-small)]"
          id="yt-key"
          onChange={(e) => setKey(e.target.value)}
          placeholder={words.keyPlaceholder}
          spellCheck={false}
          type="password"
          value={key}
        />
        <Button disabled={busy || !key.trim()} onClick={() => void send({ key: key.trim() })} size="sm" type="button">
          {busy ? words.saving : words.save}
        </Button>
        {configured && (
          <Button disabled={busy} onClick={() => void send({ check: true })} size="sm" type="button" variant="outline">
            {busy ? words.checking : words.check}
          </Button>
        )}
      </div>
      {note && <p className="rounded-md border border-border bg-muted/40 p-3 text-[length:var(--fs-small)]">{note}</p>}
      {bad && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--fs-small)]">{bad}</p>
      )}
    </div>
  );
}
