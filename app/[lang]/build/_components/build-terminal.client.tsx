"use client"

import { Moon, Play, Square, Eraser } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { createMouseFilter, MOUSE_OFF } from "@/lib/fractera/mouse-filter.mjs"
import { type XtermHandle, XtermTerminal } from "../../terminal/_components/xterm-terminal.client"

// ТЕРМИНАЛ МАСТЕРСКОЙ: СПИТ ДО ЗАПУСКА, ЖИВЁТ ПРИ УХОДЕ, ОСТАНАВЛИВАЕТСЯ КНОПКОЙ (шаг 202-2).
//
// 🎯 СЛОВА ВЛАДЕЛЬЦА 2026-09-15: «до того как она будет запущена она не должна расходовать ресурсы компьютера –
// серые» · «Когда я перехожу в другие вкладки терминал должен продолжать работать» · «нужно быть кнопка
// остановить. Кстати там есть кнопка сбросить».
//
// 🔒 СОН ПРОВЕРЯЕТСЯ ДВЕРЬЮ СТАТУСА ДО ЛЮБОГО СОКЕТА. Спит — рисуем серую карточку и ничего не открываем.
// Работает — подключаемся сами: процесс уже жив, подключение ничего нового не рождает.
// 🔒 ЖИВУЧЕСТЬ — СВОЙСТВО СЕРВЕРА, А НЕ ЭТОГО ОСТРОВКА: уход со вкладки закрывает сокет, сессия на сервере
// остаётся и при возврате отдаёт накопленный экран. Поэтому здесь нет попыток «не размонтироваться».
// 🔒 «СБРОСИТЬ» ПЕРЕИМЕНОВАН В «ОЧИСТИТЬ ЭКРАН»: прежняя кнопка чистила только экран браузера, а слово
// «сбросить» читалось как «перезапустить». Остановка процесса — отдельная кнопка, и спутать их теперь нельзя.
// 🔒 ТЕРМИНАЛ ПЕРЕИСПОЛЬЗУЕТ `XtermTerminal` И ФИЛЬТР МЫШИ СТРАНИЦЫ ПОДПИСКИ: вторая копия разошлась бы с первой.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

type Words = {
  sleepingTitle: string
  sleepingBody: string
  start: string
  starting: string
  stop: string
  clear: string
  running: string
  stopped: string
  exited: string
  offline: string
  forbidden: string
  keepsRunning: string
}

type State = "checking" | "sleeping" | "connecting" | "running" | "stopped" | "offline" | "forbidden"

export function BuildTerminal({ words }: { words: Words }) {
  const [state, setState] = useState<State>("checking")
  const [note, setNote] = useState("")
  const termRef = useRef<XtermHandle>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sizeRef = useRef({ cols: 120, rows: 32 })
  const mouseRef = useRef(createMouseFilter())
  // Закрытие, которое сделали мы сами (уход со страницы, остановка), не должно читаться как обрыв связи.
  const quietCloseRef = useRef(false)

  const send = useCallback((payload: unknown) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
  }, [])

  const connect = useCallback(
    async (wantStart: boolean) => {
      setState("connecting")
      setNote("")
      let ticket = ""
      try {
        const res = await fetch(`${BASE}/api/fractera/pty-ticket`, { method: "POST" })
        if (res.status === 401 || res.status === 403) {
          setState("forbidden")
          return
        }
        ticket = ((await res.json()) as { ticket?: string }).ticket ?? ""
      } catch {
        setState("offline")
        return
      }
      const scheme = window.location.protocol === "https:" ? "wss" : "ws"
      const ws = new WebSocket(`${scheme}://${window.location.host}${BASE}/pty`)
      wsRef.current = ws
      quietCloseRef.current = false

      ws.onopen = () => {
        ws.send(JSON.stringify({ mode: "build", start: wantStart, ticket, type: "init" }))
        ws.send(JSON.stringify({ type: "resize", ...sizeRef.current }))
        mouseRef.current = createMouseFilter()
        setState("running")
        // Сначала возвращаем экран к исходным режимам, потом сервер пришлёт накопленный вывод.
        termRef.current?.reset()
        termRef.current?.write(MOUSE_OFF)
        termRef.current?.focus()
      }
      ws.onmessage = (event) => {
        const chunk = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data)
        termRef.current?.write(mouseRef.current(chunk))
      }
      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null
        if (quietCloseRef.current) return
        if (event.reason === "not-running") {
          setState("sleeping")
        } else if (event.reason === "stopped") {
          setState("stopped")
          setNote(words.stopped)
        } else if (event.reason === "exited") {
          setState("stopped")
          setNote(words.exited)
        } else {
          setState("offline")
          setNote(words.offline)
        }
      }
    },
    [words.exited, words.offline, words.stopped],
  )

  // Открыли раздел: спросить, спит ли терминал. Спит — ничего не открывать.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${BASE}/api/fractera/build-session`, { cache: "no-store" })
        if (cancelled) return
        if (res.status === 401 || res.status === 403) {
          setState("forbidden")
          return
        }
        const body = (await res.json()) as { running?: boolean }
        if (cancelled) return
        if (body.running) {
          await connect(false)
        } else {
          setState("sleeping")
        }
      } catch {
        if (!cancelled) setState("offline")
      }
    })()
    return () => {
      cancelled = true
      // 🔒 УХОД СО ВКЛАДКИ: закрываем только сокет — сессия на сервере продолжает работать.
      quietCloseRef.current = true
      wsRef.current?.close()
    }
  }, [connect])

  const handleStop = useCallback(async () => {
    quietCloseRef.current = true
    try {
      await fetch(`${BASE}/api/fractera/build-session`, {
        body: JSON.stringify({ action: "stop" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    } catch {
      /* статус ниже скажет правду */
    }
    wsRef.current?.close()
    setState("stopped")
    setNote(words.stopped)
  }, [words.stopped])

  const handleClear = useCallback(() => {
    termRef.current?.reset()
    termRef.current?.focus()
  }, [])

  const handleData = useCallback((data: string) => send({ data, type: "stdin" }), [send])
  const handleResize = useCallback(
    (size: { cols: number; rows: number }) => {
      sizeRef.current = size
      send({ type: "resize", ...size })
    },
    [send],
  )

  if (state === "forbidden") {
    return <p className="text-[length:var(--fs-body)] text-muted-foreground">{words.forbidden}</p>
  }

  const live = state === "running" || state === "connecting"

  return (
    <div className="flex flex-col gap-3" data-build-terminal data-state={state}>
      {!live && (
        // 🔒 СЕРАЯ КАРТОЧКА — ВИДИМЫЙ ЗНАК СНА: слово владельца «серые».
        <div className="flex flex-col gap-3 rounded-lg border border-border border-dashed bg-muted/40 p-5 text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Moon className="size-4" aria-hidden />
            {state === "checking" ? "…" : words.sleepingTitle}
          </div>
          <p className="max-w-3xl text-[length:var(--fs-body)]">{words.sleepingBody}</p>
          {note && <p className="text-[length:var(--fs-small)]">{note}</p>}
          <div>
            <Button disabled={state === "checking"} onClick={() => connect(true)} type="button" data-build-start>
              <Play className="size-4" aria-hidden />
              {words.start}
            </Button>
          </div>
        </div>
      )}

      {live && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-2 py-1 text-[length:var(--fs-small)] text-emerald-800 dark:text-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
              {state === "connecting" ? words.starting : words.running}
            </span>
            <span className="text-[length:var(--fs-small)] text-muted-foreground">{words.keepsRunning}</span>
            <div className="ml-auto flex gap-2">
              <Button onClick={handleClear} size="sm" type="button" variant="outline">
                <Eraser className="size-4" aria-hidden />
                {words.clear}
              </Button>
              <Button onClick={handleStop} size="sm" type="button" variant="destructive" data-build-stop>
                <Square className="size-4" aria-hidden />
                {words.stop}
              </Button>
            </div>
          </div>
          <div className="h-[70dvh] min-h-[420px] overflow-hidden rounded-lg bg-[#0b0b0c] p-2">
            <XtermTerminal onData={handleData} onResize={handleResize} ref={termRef} />
          </div>
        </>
      )}
    </div>
  )
}
