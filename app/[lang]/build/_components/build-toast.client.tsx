"use client"

import { useEffect, useState } from "react"

// ТОСТ МАСТЕРСКОЙ — ОДНА РЕАЛИЗАЦИЯ НА ВСЕ ЕЁ ЭКРАНЫ (221-3, 2026-09-17).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-17, ДОСЛОВНО: «я вставил токен, и токен сохранился — никаких признаков
// того, что токен был успешно подключён, я не увидел, кроме того что где-то вверху мелким шрифтом
// появилась галочка. Но это не ответ. Наверно всё-таки должен всплыть тост с информацией об успехе
// или об ошибке и о следующем шаге».
//
// 🔒 ПАКЕТА НЕТ И НЕ БУДЕТ, ТОСТ СВОЙ. ✗ Оплачено 2026-09-10: в чате `<Toaster/>` не смонтирован ни
// в одном файле, а у памяти нет и самого пакета — `toast()` звался в пустоту, и «Ключ сохранён» не
// видел никто. Своя строка разметки не зависит ни от пакета, ни от раскладки службы.
//
// 🔒 ФАЙЛ ЗАВЕДЁН ПОТОМУ, ЧТО ЭКРАНОВ СТАЛО ДВА. Тост «Эволюции памяти» был написан внутри своего
// экрана; второй такой же, написанный рядом, разошёлся бы с ним на первой правке — и тот, которым
// пользуются реже, остался бы с прежним видом. Тот же закон, что у ленты сообщений.
//
// 🔒 У УСПЕХА И ОТКАЗА РАЗНЫЙ ВИД И РАЗНАЯ РОЛЬ ДЛЯ ЧИТАЛКИ ЭКРАНА. Отказ, выглядящий как успех, —
// это уверенное умолчание: человек уходит со страницы, считая работу сделанной.

export type Toast = { kind: "bad" | "ok"; text: string }

const EMPTY: Toast = { kind: "ok", text: "" }

/** Состояние тоста и способ его сказать. Тост гаснет сам — держать его нечем и незачем. */
export function useToast(lifetimeMs = 7000) {
  const [toast, setToast] = useState<Toast>(EMPTY)

  useEffect(() => {
    if (!toast.text) return
    const t = setTimeout(() => setToast(EMPTY), lifetimeMs)
    return () => clearTimeout(t)
  }, [toast, lifetimeMs])

  return {
    say: (text: string, kind: Toast["kind"] = "ok") => setToast({ kind, text }),
    toast,
  }
}

export function BuildToast({ toast }: { toast: Toast }) {
  if (!toast.text) return null
  const bad = toast.kind === "bad"
  return (
    <p
      className={`fixed bottom-6 left-1/2 z-50 max-w-[min(92vw,34rem)] -translate-x-1/2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        bad ? "border-destructive bg-card text-destructive" : "border-primary bg-card"
      }`}
      data-build-toast
      data-toast-kind={toast.kind}
      role={bad ? "alert" : "status"}
    >
      {toast.text}
    </p>
  )
}
