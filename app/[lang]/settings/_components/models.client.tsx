"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Brain, CheckCircle2 } from "lucide-react";
import { Small } from "@/components/ui/typography";
import { SettingsCard } from "./settings-card";

// КАРТОЧКИ МОДЕЛЕЙ ПАМЯТИ (189-7).
//
// 🎯 ЗАКАЗ ВЛАДЕЛЬЦА 2026-09-13: «в настройки пробрасывай настройки модели.
// Сейчас в настройках только есть выбор Anthropic API key».
//
// 🔒 ДВЕ КАРТОЧКИ, А НЕ ОДНА, ПОТОМУ ЧТО ЭТО ДВЕ РАЗНЫЕ ВЕЩИ С РАЗНОЙ ЦЕНОЙ
// ОШИБКИ. Модель размышления меняется свободно и применяется сразу. Модель
// встраиваний меняет размерность вектора — на непустом складе это потеря
// данных, а не смена настройки. Сведи их в одну карточку с общей кнопкой — и
// человек однажды нажмёт вторую, думая про первую.

type Choice = { id: string; why: string; dims?: number; needsKey?: boolean };

type State = {
  choices: { embed: Choice[]; think: Choice[] };
  embed: { configured: boolean; count: number; dims: number; model: string; reachable: boolean };
  hasKey: boolean;
  think: string;
};

export function ModelSections() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "bad" | "good"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/fractera/models", { cache: "no-store" });
      if (r.ok) setState((await r.json()) as State);
    } catch {
      // Недостижимо — карточки скажут это словами ниже, а не покажут пустоту.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function choose(what: "embed" | "think", id: string) {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/fractera/models", {
        body: JSON.stringify({ id, what }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const j = (await r.json()) as { applied?: string; error?: string; ok?: boolean };
      if (!r.ok || !j.ok) {
        setNote({ kind: "bad", text: REASONS[String(j.error)] ?? REASONS.unknown });
        return;
      }
      setNote({
        kind: "good",
        text:
          j.applied === "now"
            ? "Готово. Новая модель применяется со следующего разбора — перезапускать ничего не нужно."
            : "Записано. Слой данных читает настройку при старте, поэтому применится она после его перезапуска.",
      });
      void load();
    } catch {
      setNote({ kind: "bad", text: REASONS.unknown });
    } finally {
      setBusy(false);
    }
  }

  const s = state;

  return (
    <>
      <SettingsCard
        icon={<Brain className="size-4 text-muted-foreground" />}
        mark={{ "data-think-model": "" }}
        open
        status={
          s ? (
            <Small className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="size-3.5" /> сейчас: {s.think}
            </Small>
          ) : null
        }
        title="Модель размышления"
      >
        <Small className="text-muted-foreground">
          Ею память думает: разбирает фразу человека и собирает ответ. Сильнее модель — точнее разбор
          и дороже каждый вызов; расход идёт из той же подписки, которой живёт бот.
        </Small>

        {/* 🔒 ЗАПЕРТАЯ МОДЕЛЬ ГОВОРИТ, ЧЕМ ОНА ОТПЕРТА, А НЕ ПРОСТО СЕРЕЕТ.
            Недоступная кнопка без объяснения читается как поломка; здесь же
            рядом, этажом выше, стоит ровно то, чего не хватает. */}
        <div className="mt-4 space-y-2">
          {(s?.choices.think ?? []).map((m) => {
            const locked = Boolean(m.needsKey) && !s?.hasKey;
            return (
              <button
                className={`w-full rounded-md border p-3 text-left ${
                  s?.think === m.id ? "border-primary bg-primary/5" : "border-border"
                } disabled:opacity-50`}
                disabled={busy || s?.think === m.id || locked}
                key={m.id}
                onClick={() => void choose("think", m.id)}
                type="button"
              >
                <span className="block font-medium text-[length:var(--fs-body)]">{m.id}</span>
                <span className="block text-[length:var(--fs-small)] text-muted-foreground">
                  {m.why}
                </span>
                {locked && (
                  <span className="mt-1 block text-[length:var(--fs-small)]">
                    Недоступна: ключ Anthropic не задан. Он задаётся карточкой выше.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Brain className="size-4 text-muted-foreground" />}
        mark={{ "data-embed-model": "" }}
        open
        status={
          s?.embed.reachable ? (
            <Small className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="size-3.5" /> сейчас: {s.embed.model || "не задана"}
            </Small>
          ) : (
            <Small className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="size-3.5" /> хранилище недостижимо
            </Small>
          )
        }
        title="Модель встраиваний"
      >
        <Small className="text-muted-foreground">
          Ею память считает смысл текста, чтобы находить нужное другими словами. Модель не читает
          текст — она его измеряет, поэтому загрузка сюда дешевле, чем в граф связей.
        </Small>

        {/* 🛑 ПРЕДУПРЕЖДЕНИЕ СТОИТ ДО КНОПОК, А НЕ ПОСЛЕ. Человек, узнавший о цене
            после нажатия, читает не предупреждение, а объяснение потери. */}
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <Small>
            Смена модели меняет размер вектора, а он входит в индекс: всё, что уже уложено, станет
            нечитаемым. Поэтому сменить её можно только на пустом хранилище — иначе сперва выгрузите
            нужное и очистите склад.
          </Small>
        </div>

        {s?.embed.reachable && (
          <Small className="mt-3 block text-muted-foreground">
            В хранилище сейчас: {s.embed.count} кусков · {s.embed.dims} измерений.
            {s.embed.count > 0 ? " Смена недоступна, пока оно не пусто." : " Пусто — сменить можно."}
          </Small>
        )}

        <div className="mt-4 space-y-2">
          {(s?.choices.embed ?? []).map((m) => (
            <button
              className={`w-full rounded-md border p-3 text-left ${
                s?.embed.model === m.id ? "border-primary bg-primary/5" : "border-border"
              } disabled:opacity-50`}
              disabled={busy || !s?.embed.reachable || s?.embed.model === m.id || (s?.embed.count ?? 0) > 0}
              key={m.id}
              onClick={() => void choose("embed", m.id)}
              type="button"
            >
              <span className="block font-medium text-[length:var(--fs-body)]">
                {m.id} · {m.dims} измерений
              </span>
              <span className="block text-[length:var(--fs-small)] text-muted-foreground">
                {m.why}
              </span>
            </button>
          ))}
        </div>
      </SettingsCard>

      {note && (
        <p
          className={`rounded-md border p-4 text-[length:var(--fs-small)] ${
            note.kind === "good"
              ? "border-border bg-muted/40"
              : "border-destructive/40 bg-destructive/5"
          }`}
        >
          {note.text}
        </p>
      )}
    </>
  );
}

/**
 * Почему не получилось — словами, и каждый отказ свой.
 *
 * 🔒 ОБЩАЯ ФРАЗА «ЧТО-ТО ПОШЛО НЕ ТАК» ЗДЕСЬ ОСОБЕННО ДОРОГА: «склад не пуст» и
 * «слой данных не отвечает» чинятся по-разному, и человек без этого различия
 * пойдёт чинить не то.
 */
const REASONS: Record<string, string> = {
  "already-set": "Эта модель уже стоит.",
  "data-unreachable": "Слой данных не отвечает — сменить модель встраиваний сейчас нельзя.",
  "env-missing": "Файл настроек слоя данных не найден на этой машине.",
  "needs-anthropic-key": "Этой модели нужен ключ Anthropic — подписка её не открывает. Задайте ключ карточкой выше.",
  "index-drop-failed": "Настройка записана, но старый индекс снести не удалось. Уберите его вручную до перезапуска.",
  "store-not-empty": "В хранилище есть записи. Смена модели сделала бы их нечитаемыми — сперва очистите склад.",
  unknown: "Не удалось сохранить. Попробуйте ещё раз.",
  "unknown-model": "Такой модели нет в списке.",
  "write-failed": "Не удалось записать настройку на диск.",
};
