"use client";

import { Streamdown } from "streamdown";
import { langOf, type CodeViewLabels } from "../types/code-view";

// Просмотр исходного кода с подсветкой (инструмент, шаг 501).
//
// 🔒 ПЕРЕНЕСЁН В СЛУЖБУ ПАМЯТИ ИЗ `fractera-next-starter/_tools/code-view/client/code-view.client.tsx`
// (194-10, слово владельца: «просмотрщик кода у нас тоже есть, который позволяет просматривать элементы
// без необходимости их запускать»). Входы, определение языка, рамка и правило «код без подсветки читается,
// пустой экран — нет» перенесены дословно.
//
// 🔒 ИЗМЕНЕНО ПРОТИВ ИСТОЧНИКА — ОДНО, И С ПРИЧИНОЙ: подсветку делает `Streamdown`, а не `shiki`. Пакета
// `shiki` в службе памяти нет (измерено на сервере 2026-09-13), и у источника без него подсветка молча
// становилась обычным текстом. `streamdown` здесь уже стоит и подсвечивает блок кода сам — та же
// адаптация, что у просмотра объекта (194-8). Отсюда же ушло ленивое состояние загрузки: разбор синхронный.
//
// Из источника — ДВЕ ТЕМЫ СРАЗУ и ЗЕРКАЛО: такой же инструмент живёт в панели и в стартере; копия
// намеренная, служба памяти обязана работать без них.

export function CodeView(
  { code, filename, lang, labels, className }: {
    code: string;
    /** Имя файла — по расширению определяется язык, если он не задан явно. */
    filename?: string;
    /** Явный язык. Приоритетнее имени файла. */
    lang?: string;
    labels?: CodeViewLabels;
    className?: string;
  },
) {
  const language = lang ?? langOf(filename ?? "");

  // Ограда длиннее самой длинной серии обратных кавычек в коде: иначе Markdown-строка внутри
  // исходника закрыла бы блок раньше времени, и хвост файла отрисовался бы как текст.
  const fence = "`".repeat(Math.max(3, ...(code.match(/`+/g) ?? []).map((m) => m.length + 1)));

  const box = `overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed ${className ?? ""}`;

  if (!code) {
    return <pre className={`${box} whitespace-pre-wrap break-words text-foreground`}>{labels?.loading ?? "…"}</pre>;
  }

  return (
    <div className={`${box} [&_pre]:!bg-transparent [&_pre]:m-0 [&_code]:font-mono`}>
      <Streamdown className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {`${fence}${language}\n${code}\n${fence}`}
      </Streamdown>
    </div>
  );
}
