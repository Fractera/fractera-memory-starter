import { CheckCircle2, Youtube } from "lucide-react"
import { Small } from "@/components/ui/typography"
import { SettingsCard } from "./settings-card"
import { YoutubeKeyForm, type YoutubeKeyWords } from "./youtube-key.client"
import { readYoutubeKeyState } from "@/lib/architect/youtube-key"

// КАРТОЧКА «КЛЮЧ YOUTUBE DATA API» В «НАСТРОЙКАХ» ПАМЯТИ (195-4).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-14: «На вкладке настройки Memory сделай добавление ключа с описанием того как это сделать».
// Поэтому в карточке не только поле, но и шаги: где в Google Cloud взять ключ и что включить.
//
// 🔒 ПОТРЕБИТЕЛЬ ОДИН — ПАМЯТЬ, И ПЛАШКА ГОВОРИТ ПРО НЕГО ОДНОГО. У ключа OpenAI четыре потребителя и потому жёлтое состояние «есть у одних,
// нет у других»; здесь такого состояния не существует, и выдумывать его значило бы обещать проверку, которой нет.
// 🔒 ЧТО ДАЁТ КЛЮЧ, СКАЗАНО ЧЕСТНО: данные ролика и ГЛАВЫ из описания. Текста субтитров официальный API не отдаёт — измерено (`401`), и
// умолчать об этом значило бы обещать расшифровку, которой на этом пути нет.

export type YoutubeKeyCardWords = {
  title: string
  lead: string
  exists: string
  missing: string
  stepsTitle: string
  steps: string[]
  quotaNote: string
  form: YoutubeKeyWords
}

export function YoutubeKeySection({ words }: { words: YoutubeKeyCardWords }) {
  const state = readYoutubeKeyState()

  const status = state.configured ? (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[length:var(--fs-small)] text-emerald-800 dark:text-emerald-200"
      data-youtube-key-state="ok"
    >
      <CheckCircle2 className="size-3.5" />
      {words.exists}
      <span className="font-mono opacity-70">…{state.tail}</span>
    </span>
  ) : (
    <span className="text-[length:var(--fs-small)] text-muted-foreground" data-youtube-key-state="missing">
      {words.missing}
    </span>
  )

  return (
    <SettingsCard
      bodyClassName="flex flex-col gap-3 p-3"
      icon={<Youtube className="size-4 text-muted-foreground" />}
      mark={{ "data-youtube-key": "" }}
      open
      status={status}
      title={words.title}
    >
      <Small className="leading-relaxed text-muted-foreground">{words.lead}</Small>

      <div className="space-y-2">
        <p className="font-medium text-[length:var(--fs-small)]">{words.stepsTitle}</p>
        <ol className="list-decimal space-y-1 pl-5 text-[length:var(--fs-small)] text-muted-foreground">
          {words.steps.map((s) => (
            <li key={s.slice(0, 40)}>{s}</li>
          ))}
        </ol>
      </div>

      <YoutubeKeyForm configured={state.configured} words={words.form} />

      <Small className="leading-relaxed text-muted-foreground">{words.quotaNote}</Small>
    </SettingsCard>
  )
}
