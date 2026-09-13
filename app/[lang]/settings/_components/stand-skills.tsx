import { BookOpen } from "lucide-react"
import { SettingsCard } from "./settings-card"

// ВКЛАДКА «НАВЫК» СТЕНДА (194-19).
//
// 🔒 ТЕКСТ КАК ЕСТЬ, БАЙТ В БАЙТ (закон 194-6): человек видит ровно то, что прочитает агент, а не отрисовку,
// которая могла бы спрятать строку. Второй копии текста нет — файл читается с диска на каждый запрос.
// 🔒 КАЖДЫЙ НАВЫК — СВЁРНУТОЙ КАРТОЧКОЙ, ТОЙ ЖЕ, ЧТО У НАСТРОЕК И ВВОДНОГО ТЕКСТА ОБЪЕКТОВ: у теста памяти и
// объектов их по два, и два длинных документа подряд человек не пролистает. Единственный навык раскрыт сразу —
// сворачивать то, что показать больше нечего, значит заставить лишний раз нажать.
// 🛑 НЕТ ФАЙЛА — СТРОКА СЛОВАМИ С ПУТЁМ, А НЕ ПУСТАЯ КАРТОЧКА: молчащий экран читается как поломка.

export type StandSkill = { name: string; path: string; text: string }

export function StandSkills({ items, words }: { items: StandSkill[]; words: { missing: string } }) {
  return (
    <div className="space-y-3" data-stand-skills={items.map((s) => s.name).join(" ")}>
      {items.map((s) => (
        <SettingsCard
          bodyClassName="p-0"
          icon={<BookOpen className="size-4 text-muted-foreground" />}
          key={s.name}
          mark={{ "data-skill": s.name }}
          open={items.length === 1}
          title={s.name}
        >
          {s.text ? (
            <pre className="overflow-x-auto whitespace-pre-wrap bg-muted/30 p-4 font-mono text-[length:var(--fs-small)]">
              {s.text}
            </pre>
          ) : (
            <p className="p-4 text-[length:var(--fs-small)] text-destructive">
              {words.missing.replace("{path}", s.path)}
            </p>
          )}
        </SettingsCard>
      ))}
    </div>
  )
}
