"use client";

// ПРОСМОТР ОБЪЕКТА ПАМЯТИ (194-8). КОПИЯ `PreviewPopup` медиатеки панели —
// `ai-workspace/bridges/app/app/[lang]/media/_components/preview-popup.client.tsx`.
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Инструменты тебе не нужно строить их обязательно нужно скопировать и
// вставить жёстко перенести и адаптировать». Поведение источника перенесено дословно; всё, что изменено,
// перечислено ниже поимённо, с причиной.
//
// Из источника: каждый вид показывается так, как его действительно читают: картинка картинкой,
// видео плеером, PDF собственным просмотрщиком браузера, Markdown — ОТРЕНДЕРЕННЫМ, потому что смысл
// хранить Markdown в том документе, которым он становится. У HTML два лица — страница и её код, —
// поэтому предпросмотр переключается между ними, а не выбирает одно.
//
// 🔒 ИЗМЕНЕНО ПРОТИВ ИСТОЧНИКА:
// 1. Markdown и код рисует `Streamdown`, а не `react-markdown` и `shiki`: этих пакетов в службе памяти
//    нет (измерено на сервере 2026-09-13), `streamdown` стоит и уже рисует паспорт. Своих
//    `remarkPlugins` не передаём: переданный список ЗАМЕНЯЕТ умолчание, а в умолчании живёт GFM с
//    таблицами (оплачено паспортом чата).
// 2. Добавлено аудио: у источника его нет, а память принимает голосовые.
// 3. Режим `inline`: объект стоит внутри блока «Что легло в память», а не всплывает поверх экрана.
//    Без `inline` — всплывающее окно, как у источника.
// 4. Адрес файла — дверь памяти `object-file`; подписи — словарь памяти, слова панели дословно.
// 5. Тип входа — нужные поля `MediaItem` панели, объявленные здесь (одна правда для сервера и экрана).

import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { Code2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Поля строки медиатеки, которые нужны просмотру (форма `MediaItem` панели). */
export type PreviewItem = {
  duration: number | null;
  extension: string;
  height: number | null;
  id: string;
  mime_type: string;
  name: string;
  size: number;
  width: number | null;
};

export type PreviewLabels = {
  code: string; preview: string; open: string; close: string;
  reading: string; unreadable: string;
  kindImage: string; kindVideo: string; kindAudio: string; kindPdf: string; kindMarkdown: string; kindHtml: string; kindFile: string;
};

export function ObjectPreview(
  { item, fileUrl, labels, onClose, inline = false }:
  { item: PreviewItem; fileUrl: string; labels: PreviewLabels; onClose?: () => void; inline?: boolean },
) {
  const isImage = item.mime_type.startsWith("image/");
  const isVideo = item.mime_type.startsWith("video/");
  // Адаптация 2: аудио. `.oga`/`.ogg` из Telegram лежат с `application/octet-stream` — род по расширению.
  const isAudio = item.mime_type.startsWith("audio/") || ["mp3", "m4a", "wav", "ogg", "oga", "opus", "flac", "aac"].includes(item.extension);
  const isPdf = item.mime_type === "application/pdf" || item.extension === "pdf";
  const isMd = item.extension === "md" || item.extension === "markdown" || item.mime_type === "text/markdown";
  const isHtml = item.mime_type === "text/html" || item.extension === "html" || item.extension === "htm";
  const isTextual = isMd || isHtml;

  const [text, setText] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  // Источник читал Markdown здесь, а код — вторым запросом. Один запрос на оба лица: текст один и тот же.
  useEffect(() => {
    if (!isTextual) return;
    let alive = true;
    fetch(fileUrl, { credentials: "include" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((t) => { if (alive) setText(t); })
      .catch((e) => { if (alive) setTextError(String(e)); });
    return () => { alive = false; };
  }, [isTextual, fileUrl]);

  const kind = isImage ? labels.kindImage
    : isVideo ? labels.kindVideo
    : isAudio ? labels.kindAudio
    : isPdf ? labels.kindPdf
    : isMd ? labels.kindMarkdown
    : isHtml ? labels.kindHtml
    : labels.kindFile;

  // Адаптация 1: код показывается блоком кода Markdown — `Streamdown` подсвечивает его сам.
  const fence = "`".repeat(Math.max(3, ...((text ?? "").match(/`+/g) ?? []).map((m) => m.length + 1)));
  const codeMd = text === null ? "" : `${fence}${isHtml ? "html" : "markdown"}\n${text}\n${fence}`;

  const body = (
    <div className="flex w-full flex-col gap-3 rounded-xl bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <span className="truncate text-xs font-semibold text-foreground">{item.name}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {isTextual && (
            <Button variant="outline" size="xs" onClick={() => setShowCode((v) => !v)}>
              <Code2 size={11} />{showCode ? labels.preview : labels.code}
            </Button>
          )}
          {/* Полная ширина — дело браузера, а не всплывающего окна: файл
              открывается своей вкладкой, в настоящем размере экрана. */}
          <Button variant="outline" size="xs" onClick={() => window.open(fileUrl, "_blank", "noopener")}>
            <ExternalLink size={11} />{labels.open}
          </Button>
          {!inline && onClose && (
            <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label={labels.close}>
              <X size={13} />
            </Button>
          )}
        </div>
      </div>

      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl} alt={item.name} className="max-h-[60vh] w-full rounded-lg border border-border object-contain" />
      )}
      {isVideo && <video src={fileUrl} controls className="max-h-[60vh] w-full rounded-lg border border-border bg-black" />}
      {isAudio && <audio src={fileUrl} controls className="w-full" />}
      {isPdf && <iframe src={fileUrl} title={item.name} className="w-full rounded-lg border border-border bg-white" style={{ height: "60vh" }} />}

      {/* HTML показывается СТРАНИЦЕЙ, но в песочнице. `allow-scripts` без
          `allow-same-origin` — намеренная пара: страница рисуется и её скрипты
          работают, но кадр получает пустой origin, поэтому сохранённый файл не
          прочитает cookie слоя данных и не дотянется до панели. Выдать оба флага
          вместе значило бы отменить песочницу целиком. */}
      {isHtml && !showCode && (
        <iframe src={fileUrl} title={item.name} sandbox="allow-scripts" className="w-full rounded-lg border border-border bg-white" style={{ height: "60vh" }} />
      )}

      {isMd && !showCode && (
        <div className="w-full overflow-y-auto rounded-lg border border-border bg-muted/20 p-4" style={{ maxHeight: "60vh" }}>
          {textError ? (
            <p className="text-[11px] text-destructive">{labels.unreadable}: {textError}</p>
          ) : text === null ? (
            <p className="text-[11px] text-muted-foreground">{labels.reading}</p>
          ) : (
            <Streamdown className="size-full text-[12px] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{text}</Streamdown>
          )}
        </div>
      )}

      {isTextual && showCode && (
        <div className="w-full overflow-auto rounded-lg border border-border text-[11px]" style={{ maxHeight: "60vh" }}>
          {textError ? (
            <p className="p-3 text-destructive">{labels.unreadable}: {textError}</p>
          ) : text === null ? (
            <p className="p-3 text-muted-foreground">{labels.reading}</p>
          ) : (
            <Streamdown className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{codeMd}</Streamdown>
          )}
        </div>
      )}

      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
        <span><strong className="text-foreground">{kind}</strong> · .{item.extension}</span>
        {item.width && item.height && <span>{item.width} × {item.height} px</span>}
        {item.duration ? <span>{item.duration.toFixed(1)}s</span> : null}
        <span>{(item.size / 1024).toFixed(1)} KB</span>
      </div>
    </div>
  );

  if (inline) return body;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl">{body}</div>
    </div>
  );
}
