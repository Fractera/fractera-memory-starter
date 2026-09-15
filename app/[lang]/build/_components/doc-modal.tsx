import Link from "next/link"
import { X } from "lucide-react"
import { PassportBody } from "../../settings/_components/passport-body.client"

// МОДАЛЬНОЕ ОКНО ДОКУМЕНТА МАСТЕРСКОЙ (шаг 202-4).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-15: «показывает в модальном окне который может иметь максимально высотой 1000 пикселей
// и вертикальную прокрутку».
//
// 🔒 ОКНО — СЕРВЕРНАЯ РАЗМЕТКА ПО АДРЕСУ `?doc=…`, А НЕ ПОРТАЛ КЛИЕНТСКОЙ БИБЛИОТЕКИ. Портал рисуется только после
// загрузки скриптов: ссылку на открытый документ нельзя было бы переслать, а прибор не увидел бы окна в отданной
// странице вовсе. Закрытие — ссылка без `doc`, фон — та же ссылка.
// 🔒 ПРЕДЕЛ ВЫСОТЫ — 1000 px, НО НЕ БОЛЬШЕ ЭКРАНА: на ноутбуке высотой 800 px окно в 1000 px ушло бы под край, и
// прокрутка оказалась бы у страницы, а не у документа.

export function DocModal({
  closeHref,
  closeWord,
  path,
  text,
  title,
}: {
  closeHref: string
  closeWord: string
  /** Где документ лежит в проекте (202-8). */
  path?: string
  text: string
  title: string
}) {
  return (
    <div aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4" data-doc-modal role="dialog">
      <Link aria-label={closeWord} className="absolute inset-0 bg-black/50" href={closeHref} scroll={false} />
      <div className="relative flex max-h-[min(1000px,90dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-border border-b px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-medium text-[length:var(--fs-h4)]">{title}</h2>
            {/* 🔒 ПУТЬ ДОКУМЕНТА В ПРОЕКТЕ (202-8): окно показывает не только текст, но и где он живёт. */}
            {path && (
              <code className="mt-0.5 block truncate font-mono text-[length:var(--fs-small)] text-muted-foreground" data-doc-path>
                {path}
              </code>
            )}
          </div>
          <Link
            aria-label={closeWord}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            href={closeHref}
            scroll={false}
          >
            <X className="size-5" aria-hidden />
          </Link>
        </div>
        <div className="slim-scrollbar overflow-y-auto px-5 py-4" data-doc-modal-body>
          <PassportBody text={text} />
        </div>
      </div>
    </div>
  )
}
