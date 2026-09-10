import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PassportBody } from "./settings/_components/passport-body.client";
import { memoryUi } from "./settings/_i18n/memory.i18n";

// ПУБЛИЧНАЯ ГЛАВНАЯ ПАМЯТИ = ПАСПОРТ (182-3).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-10: «паспорт продублируй на публичную страницу, чтобы
// он был доступен без авторизации. Заменить существующим — дай текст, и всё».
//
// 🔒 ОДИН ДОКУМЕНТ, ДВА ЧИТАТЕЛЯ, НИ ОДНОЙ КОПИИ. Файл `development-docs/PASSPORT.md`
// читают обе страницы — публичная здесь и «Паспорт» за входом; тело рисует один и
// тот же островок. Вторая копия текста разошлась бы с первой на первой же правке,
// и заметил бы это тот, кто читает не ту.
//
// 🔒 ЧИТАЕТСЯ С ДИСКА НА КАЖДЫЙ ЗАПРОС: правка файла видна на следующей загрузке,
// без сборки и без перезапуска.
//
// 🛑 ЗДЕСЬ НЕТ НИ КНОПОК, НИ ССЫЛОК НА СЛУЖЕБНОЕ. Вход и аккаунт живут в шапке —
// тот же довод, что у чата (156-2): вторая пара кнопок спорила бы с шапкой за то,
// какая из них правда.
//
// 🛑 `dynamic`/`runtime` НЕ ОБЪЯВЛЯЮТСЯ: у шаблона включён `cacheComponents`.

const LANGS = ["ru", "en"] as const;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function MemoryHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const ui = memoryUi(lang);

  let passport = "";
  try {
    passport = await readFile(join(process.cwd(), "development-docs", "PASSPORT.md"), "utf8");
  } catch {
    // Файла нет — страница скажет это словами, а не покажет пустоту.
    passport = "";
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16" data-public-home>
      {passport ? (
        <PassportBody text={passport} />
      ) : (
        <>
          <h1 className="font-semibold text-[length:var(--fs-h1)]">{ui.title}</h1>
          <p className="text-muted-foreground">{ui.passportMissing}</p>
        </>
      )}
    </main>
  );
}
