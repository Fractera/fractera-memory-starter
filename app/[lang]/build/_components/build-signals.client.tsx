"use client"

import { Check, MessageSquareQuote, Repeat2, TriangleAlert, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BuildToast, useToast } from "./build-toast.client"

// ЭВОЛЮЦИЯ ПАМЯТИ — ОДИН СПИСОК ЗАДАНИЙ (218-20 → 218-21 → переделан 218-23).
//
// 🎯 ИМЯ И УСТРОЙСТВО ДАНЫ ВЛАДЕЛЬЦЕМ. 2026-09-17, после второй правки, дословно: «Я попытался
// удалить одну задачу из списка и сразу появился контейнер "задание отсутствует", а внизу появилась
// вкладка "единичные пожелания" — а что это за хуйня? Я ожидал: например у меня три задания, я одно
// отклонил — оно просто исчезло… Я не хочу видеть никакой контейнер или текст с ссылками "единичные
// пожелания"».
//
// ✗ ЧЕМ ЭТО ОПЛАЧЕНО — МОЕЙ ОШИБКОЙ УРОВНЯ ЗРЕНИЯ. Я показал ВНУТРЕННЕЕ УСТРОЙСТВО: три списка по
// роду записи (сигнал · единичное · заявка не к памяти), каждый со своей пустой плашкой. Убрав одно
// пожелание, человек видел, как задание «переезжает» из списка в список, а на его месте вырастает
// «задание отсутствует» — то есть экран рассказывал о своей механике вместо того, чтобы показать
// работу.
//
// 🔒 ТЕПЕРЬ ЭКРАН ПОКАЗЫВАЕТ ОДНО: СПИСОК ЗАДАНИЙ. Род записи остаётся внутри службы и виден на
// карточке строкой («наблюдений 2», «не задача памяти»), а не отдельным разделом. Пустой контейнер
// появляется ровно один раз — когда не осталось НИ ОДНОГО задания.
//
// 🔒 ТОСТ СВОЙ, БЕЗ ПАКЕТА. ✗ Оплачено 2026-09-10: у памяти нет `sonner`, `<Toaster/>` не смонтирован
// нигде, и `toast()` звался в пустоту.
// 🔒 С 221-3 ОН ЖИВЁТ ОТДЕЛЬНЫМ ФАЙЛОМ (`build-toast.client.tsx`) и общий с экраном канала: две копии
// одной и той же всплывающей строки разошлись бы на первой правке.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

type Ground = { about: string; id: number; text: string }
type Signal = { grounds: Ground[]; repeats: Ground[]; themes: string[]; times: number }
type Beyond = { about: string; at: string; id: number; text: string }

export type SignalWords = {
  lead: string
  whatHappens: string
  empty: string
  dropOne: string
  observations: string
  repeats: string
  approve: string
  decline: string
  working: string
  toastApproved: string
  toastDeclined: string
  toastDropped: string
  failed: string
  degraded: string
  beyondMark: string
  beyondNote: string
}

/** Задание для глаз человека: одна карточка. Род записи — свойство карточки, а не отдельный список. */
type Task = { beyond: boolean; grounds: Ground[]; repeats: Ground[]; themes: string[]; times: number }

const asTasks = (signals: Signal[], single: Signal[], beyond: Beyond[]): Task[] => [
  ...[...signals, ...single].map((s) => ({ beyond: false, grounds: s.grounds, repeats: s.repeats, themes: s.themes, times: s.times })),
  ...beyond.map((b) => ({ beyond: true, grounds: [{ about: b.about, id: b.id, text: b.text }], repeats: [], themes: [], times: 1 })),
]

export function BuildSignals({
  beyond: initialBeyond,
  degraded,
  lang,
  signals: initialSignals,
  single: initialSingle,
  words,
}: {
  beyond: Beyond[]
  degraded?: string | null
  lang: string
  signals: Signal[]
  single: Signal[]
  words: SignalWords
}) {
  const [tasks, setTasks] = useState<Task[]>(asTasks(initialSignals, initialSingle, initialBeyond))
  const [busy, setBusy] = useState<number | null>(null)
  const { say, toast } = useToast()

  async function call(action: "approve" | "decline" | "drop", ids: number[], key: number, said: string) {
    setBusy(key)
    try {
      const res = await fetch(`${BASE}/api/fractera/evolution`, {
        // 🔒 ШЛЁМ ТОЛЬКО НОМЕРА: текст заявки собирает служба. Дверь, принимающая готовый текст,
        // положила бы в приёмную строителя что угодно под видом слов людей.
        body: JSON.stringify({ action, ids, lang }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
      const json = (await res.json().catch(() => null)) as
        | { after?: { beyond?: Beyond[]; signals?: Signal[]; single?: Signal[] }; ok?: boolean; task?: { id?: string } }
        | null
      if (!json?.ok) {
        say(words.failed, "bad")
        return
      }
      // 🔒 СПИСОК БЕРЁТСЯ ИЗ ОТВЕТА ДВЕРИ: экран не угадывает, что стало у службы.
      setTasks(asTasks(json.after?.signals ?? [], json.after?.single ?? [], json.after?.beyond ?? []))
      say(action === "approve" ? `${said}${json.task?.id ? ` (${json.task.id})` : ""}` : said)
    } catch {
      say(words.failed, "bad")
    } finally {
      setBusy(null)
    }
  }

  const idsOf = (t: Task) => [...t.grounds.map((g) => g.id), ...t.repeats.map((r) => r.id)]

  return (
    <div className="flex flex-col gap-6" data-build-signals>
      <div className="max-w-3xl space-y-2 text-[length:var(--fs-body)]">
        <p>{words.lead}</p>
        <p className="rounded-lg border border-border bg-muted p-3 text-[length:var(--fs-small)]">{words.whatHappens}</p>
      </div>

      {degraded ? (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{words.degraded}</span>
        </p>
      ) : null}

      {/* 🔒 ОДИН СПИСОК И ОДНА ПУСТАЯ ПЛАШКА НА ВЕСЬ ЭКРАН — требование владельца. */}
      {tasks.length === 0 ? (
        <div
          className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-12 text-center"
          data-build-empty
        >
          <p className="text-[length:var(--fs-h3)] font-medium text-muted-foreground">{words.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((t, i) => (
            <article className="rounded-lg border border-border bg-card p-4" key={`task-${t.grounds[0]?.id ?? i}`}>
              <p className="mb-2 text-xs text-muted-foreground">
                {t.beyond ? (
                  <span className="font-medium">{words.beyondMark}</span>
                ) : (
                  <>
                    {words.observations}: {t.times}
                    {t.repeats.length ? ` · ${words.repeats}: ${t.repeats.length}` : ""}
                    {t.themes.length ? ` · ${t.themes.join(", ")}` : ""}
                  </>
                )}
              </p>

              <ul className="mb-3 flex flex-col gap-2">
                {t.grounds.map((g) => (
                  <li className="flex items-start gap-2 text-sm" key={g.id}>
                    <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>
                      «{g.text}» <span className="text-muted-foreground">— #{g.id}, {g.about}</span>
                    </span>
                    {/* Крестик у отдельного пожелания — только когда их несколько: у одного его роль
                        играет кнопка «Отклонить», и вторая кнопка того же смысла путала бы. */}
                    {t.grounds.length > 1 ? (
                      <button
                        aria-label={words.dropOne}
                        className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        disabled={busy === i}
                        onClick={() => call("drop", [g.id], i, words.toastDropped)}
                        title={words.dropOne}
                        type="button"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                ))}
                {t.repeats.map((r) => (
                  <li className="flex items-start gap-2 text-sm text-muted-foreground" key={`r-${r.id}`}>
                    <Repeat2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>«{r.text}» — #{r.id}</span>
                  </li>
                ))}
              </ul>

              {t.beyond ? <p className="mb-3 text-xs text-muted-foreground">{words.beyondNote}</p> : null}

              <div className="flex flex-wrap gap-2">
                {/* 🛑 У ЗАЯВКИ «НЕ ЗАДАЧА ПАМЯТИ» НЕТ «УТВЕРДИТЬ»: это решение о другом продукте, а не
                    правка памяти, и кнопка звала бы допилить память под чужую задачу. */}
                {t.beyond ? null : (
                  <Button disabled={busy === i} onClick={() => call("approve", idsOf(t), i, words.toastApproved)} size="sm" type="button">
                    <Check className="size-4" aria-hidden />
                    {busy === i ? words.working : words.approve}
                  </Button>
                )}
                <Button
                  disabled={busy === i}
                  // 🔒 У заявки «не задача памяти» группы в счёте сигналов нет — она отклоняется как
                  // одна строка. Позвать «decline» значило бы искать группу, которой не существует.
                  onClick={() => call(t.beyond ? "drop" : "decline", t.beyond ? [t.grounds[0].id] : idsOf(t), i, words.toastDeclined)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <X className="size-4" aria-hidden />
                  {words.decline}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <BuildToast toast={toast} />
    </div>
  )
}
