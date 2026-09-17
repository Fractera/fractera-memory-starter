"use client"

import { Plus, Undo2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

// СПИСОК ЗАДАНИЙ МАСТЕРСКОЙ — ТУДУ, КОТОРЫЙ ПИШЕТ В ПРИЁМНУЮ `pre-steps/` (шаг 202-3).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-15: «что-то в роде туду листа в которых пользователь добавляет свои хотелки которые
// превращаются в pre steps».
//
// 🔒 СПИСОК ПОСЛЕ КАЖДОЙ ПРАВКИ БЕРЁТСЯ ИЗ ОТВЕТА ДВЕРИ, А НЕ СОБИРАЕТСЯ ЗДЕСЬ: экран не угадывает, что стало с
// приёмной, — он показывает, что в ней лежит. Заявку мог разобрать и Claude Code в соседнем терминале.
// 🔒 ПЕРВЫЙ СПИСОК ПРИХОДИТ С СЕРВЕРА ПРОПСОМ: страница уже прочитала приёмную, лишний запрос не нужен.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

type Task = { id: string; when: string; text: string }
type Words = {
  placeholder: string
  add: string
  adding: string
  empty: string
  withdraw: string
  listTitle: string
  tooLong: string
  failed: string
}

export function BuildTasks({ initial, where, words }: { initial: Task[]; where: string; words: Words }) {
  const [tasks, setTasks] = useState<Task[]>(initial)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")

  async function call(method: "POST" | "DELETE", body: unknown) {
    setBusy(true)
    setNote("")
    try {
      const res = await fetch(`${BASE}/api/fractera/build-tasks`, {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method,
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; tasks?: Task[] } | null
      if (json?.tasks) setTasks(json.tasks)
      if (!json?.ok) setNote(json?.error === "too-long" ? words.tooLong : words.failed)
      return Boolean(json?.ok)
    } catch {
      setNote(words.failed)
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4" data-build-tasks>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!text.trim()) return
          if (await call("POST", { text, where })) setText("")
        }}
      >
        <textarea
          className="min-h-[110px] w-full rounded-md border border-border bg-background p-3 text-[length:var(--fs-body)]"
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          placeholder={words.placeholder}
          value={text}
        />
        <div className="flex items-center gap-3">
          <Button disabled={busy || !text.trim()} type="submit">
            <Plus className="size-4" aria-hidden />
            {busy ? words.adding : words.add}
          </Button>
          {note && <span className="text-[length:var(--fs-small)] text-destructive">{note}</span>}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-[length:var(--fs-body)]">
          {words.listTitle} · {tasks.length}
        </h3>
        {tasks.length === 0 ? (
          <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((t) => (
              <li className="flex items-start gap-3 rounded-md border border-border p-3" data-task={t.id} key={t.id}>
                <input aria-hidden checked={false} className="mt-1" disabled readOnly type="checkbox" />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-[length:var(--fs-body)]">{t.text}</p>
                  <p className="mt-1 text-[length:var(--fs-small)] text-muted-foreground">{t.when}</p>
                </div>
                <Button disabled={busy} onClick={() => call("DELETE", { id: t.id })} size="sm" type="button" variant="ghost">
                  <Undo2 className="size-4" aria-hidden />
                  {words.withdraw}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
