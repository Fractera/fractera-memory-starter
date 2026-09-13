import { dataFetch, dataJson, dataService } from "./data-service";
import { forgetDocuments, learn } from "./knowledge";
import { getMessage, getMessageByObject, insertMessage } from "@/lib/messages.mjs";
import type { PreviewItem } from "@/_tools/object-view/client/object-preview.client";
import { describe, kindOf, messageKindOf } from "@/lib/describe.mjs";
import { isCodeName } from "@/_tools/code-view/types/code-langs.mjs";

/** Тип, под которым код уходит в медиатеку и отдаётся браузеру (194-10). */
const CODE_MIME = "text/plain; charset=utf-8";

// ОБЪЕКТНОЕ ХРАНИЛИЩЕ — ВЕЩЬ ЦЕЛИКОМ, С ИДЕНТИФИКАТОРОМ (192-1).
//
// 🔒 ТРЕТЬЕ ХРАНИЛИЩЕ, И ОНО ОТЛИЧАЕТСЯ ОТ ДВУХ ПЕРВЫХ ПРИРОДОЙ ОТВЕТА.
// Граф отдаёт СВЯЗИ, вектор — КУСОК ТЕКСТА, этот склад — САМ ПРЕДМЕТ: документ,
// таблицу, изображение, PDF. Ответ здесь не цитата, а идентификатор, по которому
// вещь достаётся целиком и навсегда.
//
// 🔒 ЖИВЁТ В МЕДИАТЕКЕ СЛОЯ ДАННЫХ, А НЕ В ДЕРЕВЕ СЛУЖБЫ — та же дорога, что у
// графа и вектора (решение агента по переданному полномочию 2026-09-13, развилка
// §16.8 паспорта). Один адрес, один секрет, одна дверь, уже проверяющая права.
// 🛑 ЦЕНА НАЗВАНА: объекты памяти видны в общем списке медиатеки платформы.
// Обратимость — весь доступ к складу собран в этом файле; переезд на свой склад
// меняет его один.
//
// 🔒 ПОИСКА У МЕДИАТЕКИ НЕТ ВОВСЕ — ОНА УМЕЕТ ТОЛЬКО ОТДАТЬ СПИСОК. Поэтому
// объект находится по КАРТОЧКЕ: имя, описание словами загрузившего и, у
// текстового объекта, начало содержимого. Карточка ложится в векторный склад
// своей коллекцией со ссылкой `refTable="media"`, `refId=<id объекта>` — поля
// для этого в складе уже есть. Отсюда у объектов есть число близости, то есть
// честное «ничего подходящего», которого у графа нет.
//
// 🛑 ГЛАВНЫЙ ПРЕДЕЛ, И ОН НЕ ВРЕМЕННЫЙ ДЕФЕКТ, А СВОЙСТВО: СКЛАД НЕ СМОТРИТ
// ВНУТРЬ ИЗОБРАЖЕНИЯ, ЗВУКА И PDF. Зрения, OCR и разбора в памяти нет; такой
// объект находится ровно по тому, что о нём СКАЗАЛИ при загрузке. Карточка,
// выдуманная «из содержимого», была бы ложью о том, что система видит.

/** Коллекция карточек. Одна на стенд и агента — тот же долг изоляции, что у вектора (189). */
export const OBJECT_COLLECTION = "memory-objects";

/** Порог близости карточки. */
export const OBJECT_NEAR = 0.3;
// 🔒 ЧИСЛО ИЗМЕРЕНО НА СВОЁМ КОРПУСЕ 2026-09-13, А НЕ ВЗЯТО У ВЕКТОРА.
// Прибор `scripts/probe/object-two-tests.mjs`, 32 настоящих файла витрины FES
// (24 документа, 2 PDF, 6 изображений с описаниями), `text-embedding-3-large`:
//   нужный объект : 0.356 0.358 0.363 0.378 0.380 0.383 0.397 0.422 0.441 0.475 0.530 0.549 0.564 0.675
//   посторонние   : 0.107 0.142 0.184 0.246 0.249
// Зазор 0.107; порог — его середина. Прежние 0.28 тоже лежали в зазоре, но в
// 0.03 от лучшего постороннего: запас пополам честнее запаса в пользу находки
// (закон вектора: лучше потерять слабую находку, чем выдать чужое за ответ).
// 🛑 ЯЗЫК, РОД ФАЙЛОВ ИЛИ ДЛИНА КАРТОЧКИ МЕНЯЕТСЯ — ПОРОГ ПЕРЕМЕРЯЕТСЯ.
// Порог — свойство корпуса, а не склада (закон 189-6).

/** Сколько знаков содержимого текстового объекта входит в карточку. */
const CARD_TEXT_CHARS = 1500;

/** Сколько знаков текста отдаёт `open` за один раз. */
export const OPEN_LIMIT = 12000;

// 🔒 ТЕКСТОВОСТЬ ОПРЕДЕЛЯЕТСЯ РАСШИРЕНИЕМ, А НЕ `mime_type`. Измерено на живой
// медиатеке 2026-09-13: файлы из Telegram лежат с `application/octet-stream`, а
// браузер отдаёт `.md` то как `text/markdown`, то пустым типом. Род, записанный
// загрузчиком, врёт чаще, чем имя файла.
const TEXT_EXT = new Set(["csv", "htm", "html", "json", "markdown", "md", "tsv", "txt", "xml", "yaml", "yml"]);

export function isTextName(name: string): boolean {
  const ext = String(name).toLowerCase().split(".").pop() ?? "";
  // 🔒 КОД — ТОЖЕ ТЕКСТ ДЛЯ КАРТОЧКИ (194-10): начало исходника ложится в неё, как начало документа.
  return TEXT_EXT.has(ext) || isCodeName(name);
}

export type ObjectCard = {
  id: string;
  name: string;
  mime: string;
  size: number;
  about: string;
  text: boolean;
  createdAt: string;
};

export type ObjectHit = ObjectCard & {
  /**
   * Первая строка содержимого из карточки, до 160 знаков.
   *
   * 🔒 ЗАВЕДЕНА ПО ИЗМЕРЕНИЮ 192-2: двойники одного предмета (en/ru, md/pdf) стоят
   * рядом в выдаче, и различить их по имени файла нельзя. Заголовок документа
   * называет язык и предмет без лишнего хода `open`.
   */
  preview: string;
  score: number;
  /** Ниже порога: вернулось ближайшее, а не подходящее. */
  far: boolean;
};

type MediaRow = {
  created_at?: string;
  description?: string;
  duration?: number | null;
  extension?: string;
  height?: number | null;
  id: string;
  mime_type?: string;
  name?: string;
  size?: number;
  width?: number | null;
};

/**
 * Поля строки медиатеки, которые нужны просмотру объекта (194-8).
 * 🔒 ТИП ОБЪЯВЛЕН У ИНСТРУМЕНТА, ЗДЕСЬ ТОЛЬКО ИМПОРТ: две копии одной формы разошлись бы молча.
 */
export type { PreviewItem };

// 🛑 ИМЯ `previewItemOf`, А НЕ `previewOf`: ниже уже живёт `previewOf(card)` — первая строка карточки.
// ✗ Оплачено 194-8: два объявления одного имени уронили сборку на сервере и стёрли `.next/BUILD_ID`.
const previewItemOf = (m: MediaRow): PreviewItem => ({
  duration: m.duration ?? null,
  extension: String(m.extension ?? String(m.name ?? "").split(".").pop() ?? "").toLowerCase(),
  height: m.height ?? null,
  id: String(m.id),
  mime_type: String(m.mime_type ?? ""),
  name: String(m.name ?? ""),
  size: Number(m.size ?? 0),
  width: m.width ?? null,
});

const cardOf = (m: MediaRow): ObjectCard => ({
  about: String(m.description ?? ""),
  createdAt: String(m.created_at ?? ""),
  id: String(m.id),
  mime: String(m.mime_type ?? ""),
  name: String(m.name ?? ""),
  size: Number(m.size ?? 0),
  text: isTextName(String(m.name ?? "")),
});

const vectorId = (mediaId: string) => `obj-${mediaId}`;

/** Весь список медиатеки — поиска по id у неё нет, есть только список. */
async function mediaRows(): Promise<Map<string, MediaRow>> {
  const r = await dataJson<{ items?: MediaRow[]; ok?: boolean }>("/media");
  return new Map((r.items ?? []).map((m) => [String(m.id), m]));
}

/**
 * Какие объекты медиатеки принадлежат памяти.
 *
 * 🔒 ПРИНАДЛЕЖНОСТЬ ОПРЕДЕЛЯЕТ КАРТОЧКА В НАШЕЙ КОЛЛЕКЦИИ, А НЕ ИМЯ ФАЙЛА. В той
 * же медиатеке лежат снимки из Telegram и значки проекта; открыть или стереть их
 * рукой памяти значило бы распорядиться чужим.
 */
async function ownIds(): Promise<Set<string>> {
  const r = await dataJson<{ rows?: { ref_id?: string }[] }>("/db/migrate", {
    body: JSON.stringify({
      params: [OBJECT_COLLECTION],
      sql: "SELECT ref_id FROM vectors WHERE collection = ? AND ref_table = 'media'",
    }),
    method: "POST",
  });
  return new Set((r.rows ?? []).map((x) => String(x.ref_id)));
}

/** Карточка, по которой объект будут искать. */
function buildCard(name: string, about: string, content: string | null): string {
  const lines = [`name: ${name}`];
  if (about.trim()) lines.push(`about: ${about.trim()}`);
  if (content && content.trim()) lines.push("", content.trim().slice(0, CARD_TEXT_CHARS));
  return lines.join("\n");
}

/** Первая строка содержимого карточки — после строк `name:` и `about:`. */
function previewOf(card: string): string {
  const body = card.split("\n").filter((l) => l.trim() && !/^(name|about): /.test(l));
  return (body[0] ?? "").trim().slice(0, 160);
}

/**
 * Положить объект.
 *
 * 🔒 ДВЕ ЗАПИСИ ИДУТ ПАРОЙ ИЛИ НЕ ИДУТ ВОВСЕ. Файл без карточки не найдёт никто,
 * а карточка без файла приведёт к пустоте. Карточка не легла — файл удаляется
 * тем же вызовом, и наружу уходит отказ, а не половина успеха.
 *
 * 🔒 С 194-4 ЗАПИСЕЙ ЧЕТЫРЕ, И ЗАКОН ТОТ ЖЕ (слово владельца 2026-09-13: «полное описание мы оставляем
 * в объектном хранилище вместе с файлом, саммари уходит в таблицу»). Порядок: файл с полным описанием →
 * карточка из саммари → документ графа с якорями → строка `messages_that_came_into_memory` со ссылками
 * на все три. Сорвалась ступень — уже положенное снимается, и строка ложится `failed` с причиной:
 * «пришло и не легло» тоже событие памяти, и молча его терять нельзя.
 * 🛑 ГРАФ — ТОЛЬКО КОГДА ЯКОРЯ ПЕРЕДАНЫ. Без якорей документ графа ненаходим (закон 189-2), поэтому
 * сохранение без описания моделью идёт прежним путём: файл, карточка, строка.
 */
export async function keep(input: {
  about: string;
  anchors?: string[];
  /** Кто прислал: email архитектора на стенде, имя человека в Telegram, `who` договора в API (194-13). */
  author?: string;
  bytes: Uint8Array;
  described_by?: string;
  describe_ms?: number;
  full?: string;
  language?: string;
  mime: string;
  name: string;
  source?: string;
  tags?: string[];
  title?: string;
  who?: string;
}): Promise<
  | { ok: true; card: ObjectCard; cardChars: number; messageId: number; ms: number }
  | { ok: false; error: string; messageId?: number }
> {
  const name = String(input.name ?? "").trim();
  const about = String(input.about ?? "").trim();
  const full = String(input.full ?? "").trim();
  const title = String(input.title ?? "").trim();
  if (!name) return { error: "no-name", ok: false };
  if (!input.bytes?.length) return { error: "empty-file", ok: false };

  const kind = messageKindOf(kindOf(name, input.mime) ?? "text", name);
  // 🔒 КОД УХОДИТ `text/plain`, А НЕ ТЕМ, ЧТО ПРИСЛАЛ БРАУЗЕР (194-10): `.ts` приходит `video/mp2t`, и
  // медиатека записала бы исходник видео — дверь файла отдала бы его плееру.
  const mime = isCodeName(name) ? CODE_MIME : input.mime;
  /** Строка таблицы — общая для удачи и отказа; отказ пишет её со своей причиной. */
  const row = (extra: Record<string, unknown>) =>
    insertMessage({
      author: input.author || null,
      described_by: input.described_by || null,
      describe_ms: Number.isFinite(input.describe_ms) ? input.describe_ms : null,
      direction: "remember",
      full_chars: full.length || null,
      kind,
      language: input.language || null,
      mime: mime || null,
      size_bytes: input.bytes.length,
      source: input.source || "stand",
      summary: about || null,
      tags: Array.isArray(input.tags) ? input.tags : null,
      title: title || name,
      who: input.who || "stand",
      ...extra,
    });
  const fail = async (error: string) => {
    const r = await row({ error, status: "failed" });
    return { error, messageId: r.ok ? r.id : undefined, ok: false as const };
  };

  const text = isTextName(name);
  // 🛑 ОБЪЕКТ, КОТОРЫЙ СКЛАД НЕ ЧИТАЕТ, БЕЗ ОПИСАНИЯ НЕ ПРИНИМАЕТСЯ. Его карточка
  // была бы одним именем файла — вещь лежала бы и не находилась никем, как запись
  // графа без якоря (189-2).
  if (!text && !about) return { error: "no-about", ok: false };

  const started = Date.now();
  const { url, key } = dataService();

  // multipart уходит мимо `dataFetch`: тот ставит `Content-Type: application/json`,
  // а границу частей обязан назначить сам `fetch`.
  const form = new FormData();
  form.append("file", new Blob([input.bytes as BlobPart], { type: mime || "application/octet-stream" }), name);
  form.append("title", title || name);
  // Полное описание лежит рядом с файлом; без него — саммари, как было до 194-4.
  form.append("description", full || about);

  let item: MediaRow | undefined;
  try {
    const res = await fetch(`${url}/media/upload`, {
      body: form,
      cache: "no-store",
      headers: { "X-Data-Secret": key },
      method: "POST",
    });
    const j = (await res.json().catch(() => ({}))) as { item?: MediaRow; ok?: boolean };
    // 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP (закон 161).
    if (!res.ok || j.ok === false || !j.item?.id) return fail("store-refused");
    item = j.item;
  } catch {
    return fail("store-unreachable");
  }

  const content = text ? new TextDecoder("utf-8").decode(input.bytes) : null;
  const card = buildCard(title ? `${name} — ${title}` : name, about, content);
  const dropMedia = () => dataFetch(`/media/${item!.id}`, { method: "DELETE" }).catch(() => undefined);
  const dropVector = () => dataFetch(`/vectors/${vectorId(item!.id)}`, { method: "DELETE" }).catch(() => undefined);

  try {
    const v = await dataJson<{ ok?: boolean }>("/vectors", {
      body: JSON.stringify({
        collection: OBJECT_COLLECTION,
        id: vectorId(item.id),
        refId: item.id,
        refTable: "media",
        text: card,
      }),
      method: "POST",
    });
    if (v.ok === false) throw new Error("card refused");
  } catch {
    await dropMedia();
    return fail("card-failed");
  }

  // 🔒 ДОКУМЕНТ ГРАФА ПИШЕТСЯ ВСЕГДА, С ПОЛНЫМ ОПИСАНИЕМ И ПРОИСХОЖДЕНИЕМ (194-13). Слово владельца: «нужно
  // полное описание отправлять в граф… информации о том, откуда поступил этот объект… реальный источник,
  // например Telegram от Рома Армстронг, должна быть написана дата». ✗ До 194-13 в граф уходили только название
  // и саммари, и только когда модель дала якоря: объект, сохранённый без описания моделью, в граф не попадал.
  // Имя документа — по объекту, чтобы забывание находило своё по своей метке.
  // 🔒 ЯКОРЯ: от модели; не переданы — название объекта. ПЕРЕДАНЫ, НО ВСЕ ПУСТЫЕ — это ошибка присланного, и
  // граф честно отказывает (откат ниже), а не молча подменяется названием.
  const ragSource = `object/${item.id}`;
  const SOURCE_WORDS: Record<string, string> = { api: "API памяти", stand: "тестовый стенд памяти", telegram: "Telegram" };
  const sourceWord = SOURCE_WORDS[input.source || "stand"] ?? String(input.source);
  const when = new Date().toISOString().replace(/\.\d{3}Z$/, " UTC").replace("T", " ");
  const origin = `${sourceWord}${input.author ? `, прислал ${input.author}` : ""}, ${when}, файл «${name}»`;
  const anchors = Array.isArray(input.anchors) ? input.anchors : [title || name];
  const tagLine = Array.isArray(input.tags) && input.tags.length ? `\n\nТеги: ${input.tags.join(", ")}.` : "";
  const g = await learn({
    anchors,
    origin,
    source: ragSource,
    text: `${title || name}\n\n${full || about}${tagLine}\n\nОбъект памяти id=${item.id}; саммари: ${about}`,
  });
  if (!g.accepted) {
    await dropVector();
    await dropMedia();
    return fail(`graph-refused: ${g.refused ?? "unknown"}`);
  }

  const saved = await row({
    object_id: item.id,
    rag_source: ragSource,
    status: "saved",
    vector_id: vectorId(item.id),
  });
  if (!saved.ok) {
    // 🛑 СТРОКА НЕ ЛЕГЛА — СНИМАЕТСЯ ВСЁ: файл, карточка и документ графа без строки — вещи, о которых
    // таблица памяти не знает, то есть ровно та половина успеха, которую закон этой функции запрещает.
    if (ragSource) await forgetDocuments(ragSource).catch(() => undefined);
    await dropVector();
    await dropMedia();
    return { error: `row-failed: ${saved.error}`, ok: false };
  }

  return { card: cardOf(item), cardChars: card.length, messageId: saved.id, ms: Date.now() - started, ok: true };
}

/**
 * Найти объект по смыслу вопроса.
 *
 * 🔒 ПОРОГ ПРИМЕНЯЕТСЯ ЗДЕСЬ, И ДАЛЬНИЕ НЕ ВЫБРАСЫВАЮТСЯ, А ПОМЕЧАЮТСЯ — тот же
 * закон, что у вектора: «есть, но не то» и «склад пуст» — разные ответы.
 * 🛑 КАРТОЧКА БЕЗ ФАЙЛА ПРОПУСКАЕТСЯ И СЧИТАЕТСЯ. Объект могли стереть из
 * медиатеки мимо памяти; отдать его id значило бы послать зовущего в пустоту.
 */
export async function find(input: { k?: number; question: string }): Promise<
  | { ok: true; hits: ObjectHit[]; near: ObjectHit[]; lost: number }
  | { ok: false; error: string; hits: []; near: []; lost: 0 }
> {
  try {
    const r = await dataJson<{ results?: { refId?: string; score: number; text?: string }[] }>("/vectors/search", {
      body: JSON.stringify({ collection: OBJECT_COLLECTION, k: input.k ?? 5, query: input.question }),
      method: "POST",
    });
    const rows = await mediaRows();
    const hits: ObjectHit[] = [];
    let lost = 0;
    for (const p of r.results ?? []) {
      const m = rows.get(String(p.refId));
      if (!m) {
        lost += 1;
        continue;
      }
      const score = Number(p.score);
      hits.push({ ...cardOf(m), far: score < OBJECT_NEAR, preview: previewOf(String(p.text ?? "")), score });
    }
    return { hits, lost, near: hits.filter((h) => !h.far), ok: true };
  } catch {
    return { error: "store-unreachable", hits: [], lost: 0, near: [], ok: false };
  }
}

/**
 * Открыть объект.
 *
 * 🔒 ТЕКСТ ОТДАЁТСЯ ТОЛЬКО ТЕКСТОВОМУ ОБЪЕКТУ, И ПРЕДЕЛ НАЗЫВАЕТСЯ ЧИСЛОМ.
 * Обрезанный молча документ читается как целый — и выводы из его первой трети
 * выдаются за выводы из всего.
 * 🛑 ДВОИЧНЫЙ ОБЪЕКТ ОТДАЁТ КАРТОЧКУ И ЧЕСТНЫЙ ОТКАЗ РОДА, А НЕ СОДЕРЖИМОЕ.
 */
export async function open(input: { id: string; from?: number }): Promise<
  | { ok: true; card: ObjectCard; text: string | null; from: number; shown: number; total: number }
  | { ok: false; error: string }
> {
  const id = String(input.id ?? "").trim();
  if (!id) return { error: "no-id", ok: false };
  try {
    const own = await ownIds();
    const rows = await mediaRows();
    const m = rows.get(id);
    if (!m || !own.has(id)) return { error: m ? "not-ours" : "not-found", ok: false };
    const card = cardOf(m);
    if (!card.text) return { card, from: 0, ok: true, shown: 0, text: null, total: 0 };

    const res = await dataFetch(`/media/${id}/file`);
    if (!res.ok) return { error: "file-missing", ok: false };
    const whole = await res.text();
    const from = Math.max(0, Math.min(Number(input.from ?? 0) || 0, whole.length));
    const text = whole.slice(from, from + OPEN_LIMIT);
    return { card, from, ok: true, shown: text.length, text, total: whole.length };
  } catch {
    return { error: "store-unreachable", ok: false };
  }
}

/** Что лежит в объектах памяти и настроен ли склад карточек. */
export async function status(): Promise<{ configured: boolean; objects: ObjectCard[]; ok: boolean }> {
  try {
    const s = await dataJson<{ configured?: boolean }>("/vectors/status");
    const own = await ownIds();
    const rows = await mediaRows();
    const objects = [...own].map((id) => rows.get(id)).filter(Boolean).map((m) => cardOf(m as MediaRow));
    return { configured: Boolean(s.configured), objects, ok: true };
  } catch {
    return { configured: false, objects: [], ok: false };
  }
}

/**
 * Забыть объекты памяти.
 *
 * 🛑 СТИРАЕТСЯ ТОЛЬКО СВОЁ. Без списка — всё, у чего есть карточка в нашей
 * коллекции; со списком — пересечение списка со своим. Чужой id в списке молча
 * не стирается и НАЗЫВАЕТСЯ в ответе: прибор, приславший чужое, должен узнать
 * об этом, а не решить, что стёр.
 */
export async function forget(ids?: string[]): Promise<{ ok: boolean; removed: number; refused: string[] }> {
  try {
    const own = await ownIds();
    const wanted = Array.isArray(ids) ? ids.map(String) : [...own];
    const refused = wanted.filter((id) => !own.has(id));
    let removed = 0;
    for (const id of wanted.filter((x) => own.has(x))) {
      await dataFetch(`/media/${id}`, { method: "DELETE" }).catch(() => undefined);
      const v = await dataJson<{ deleted?: number }>(`/vectors/${vectorId(id)}`, { method: "DELETE" }).catch(
        () => ({ deleted: 0 }),
      );
      if (Number(v.deleted ?? 0) > 0) removed += 1;
    }
    return { ok: true, refused, removed };
  } catch {
    return { ok: false, refused: [], removed: 0 };
  }
}

/**
 * Байты объекта памяти для браузера (194-5).
 *
 * 🔒 ТОЛЬКО СВОЁ — та же проверка принадлежности, что у `forget`: карточка в коллекции памяти.
 */
export async function fileOf(
  id: string,
): Promise<{ ok: true; body: ArrayBuffer; mime: string; name: string } | { ok: false; error: string }> {
  const key = String(id ?? "").trim();
  if (!key) return { error: "no-id", ok: false };
  try {
    if (!(await ownIds()).has(key)) return { error: "not-ours", ok: false };
    const row = (await mediaRows()).get(key);
    if (!row) return { error: "not-found", ok: false };
    const res = await dataFetch(`/media/${key}/file`);
    if (!res.ok) return { error: res.status === 404 ? "file-missing" : "store-refused", ok: false };
    // Код, положенный до 194-10, мог лечь `video/mp2t` — отдаём его текстом по имени, а не по записи.
    const mime = isCodeName(String(row.name ?? "")) ? CODE_MIME : String(row.mime_type ?? "");
    return { body: await res.arrayBuffer(), mime, name: String(row.name ?? key), ok: true };
  } catch {
    return { error: "store-unreachable", ok: false };
  }
}

/**
 * Что легло в память про найденный объект (194-9): тот же ответ, что у `messageView`, но от объекта.
 *
 * 🔒 ТОЛЬКО СВОЁ — карточка в коллекции памяти, как у `fileOf`.
 * 🔒 СТРОКИ МОЖЕТ НЕ БЫТЬ, И ЭТО НЕ ОТКАЗ: объект, положенный до таблицы сообщений, показывается файлом и
 * описанием, а экран говорит словами, что строки нет, — вместо пустого места или ошибки.
 */
export async function objectView(
  objectId: string,
): Promise<
  | { ok: true; media: PreviewItem; object: ObjectCard; row: Record<string, unknown> | null }
  | { ok: false; error: string }
> {
  const key = String(objectId ?? "").trim();
  if (!key) return { error: "no-id", ok: false };
  try {
    if (!(await ownIds()).has(key)) return { error: "not-ours", ok: false };
    const media = (await mediaRows()).get(key);
    if (!media) return { error: "not-found", ok: false };
    const row = (await getMessageByObject(key)) as Record<string, unknown> | null;
    return { media: previewItemOf(media), object: cardOf(media), ok: true, row };
  } catch {
    return { error: "store-unreachable", ok: false };
  }
}

/**
 * Что легло в память по номеру сообщения: строка таблицы как есть и карточка объекта (194-5).
 *
 * 🔒 ПОЛНОЕ ОПИСАНИЕ ЧИТАЕТСЯ ИЗ МЕДИАТЕКИ, А НЕ ИЗ ФОРМЫ: экран подтверждает легшее, а не присланное.
 */
export async function messageView(
  messageId: number,
): Promise<
  | { ok: true; media: PreviewItem | null; object: ObjectCard | null; row: Record<string, unknown> }
  | { ok: false; error: string }
> {
  if (!Number.isInteger(messageId) || messageId <= 0) return { error: "no-id", ok: false };
  try {
    const row = (await getMessage(messageId)) as Record<string, unknown> | null;
    if (!row) return { error: "not-found", ok: false };
    const media = row.object_id ? (await mediaRows()).get(String(row.object_id)) : undefined;
    return { media: media ? previewItemOf(media) : null, object: media ? cardOf(media) : null, ok: true, row };
  } catch {
    return { error: "store-unreachable", ok: false };
  }
}

/** Что возвращает `describe()` — повторено типом: модуль на JS, и союз из JSDoc TypeScript не сужает. */
type Described =
  | {
      ok: true;
      anchors: string[];
      described_by: string;
      full: string;
      kind: string;
      language: string;
      ms: number;
      summary: string;
      tags: string[];
      title: string;
    }
  | { ok: false; refusal: string; why?: string };

/**
 * Принять объект целиком (194-15): описать моделью, если зовущий не прислал своего саммари, и положить в
 * четыре хранилища тем же `keep()`.
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Делай полный вариант: методы объектов в API»; про `media` у remember —
 * «Через ingest».
 * 🔒 ОДНА ФУНКЦИЯ НА ВСЕХ, КТО НЕ ДЕЛАЕТ ВТОРОГО ХОДА: договор `/v1/keep_object`, вложения `remember`,
 * будущий Telegram. У человека на стенде ходов два (описать → поправить → сохранить), и там `describe` и
 * `keep` зовутся раздельно — но хранилища, откат и строка таблицы у всех одни.
 * 🔒 ПРИСЛАННОЕ ЗОВУЩИМ ПОБЕЖДАЕТ ОПИСАННОЕ МОДЕЛЬЮ ПОЛЕ ЗА ПОЛЕМ. Прислано саммари — модель не зовётся
 * вовсе: ход Claude по подписке стоит десятки секунд, и платить его за уже написанное незачем.
 */
export async function ingest(input: {
  anchors?: string[];
  author?: string;
  bytes: Uint8Array;
  full?: string;
  mime: string;
  name: string;
  source?: string;
  summary?: string;
  tags?: string[];
  title?: string;
  who?: string;
}): Promise<
  | {
      ok: true;
      card: ObjectCard;
      described: boolean;
      kind: string;
      messageId: number;
      ms: number;
      summary: string;
      title: string;
    }
  | { ok: false; error: string; messageId?: number; why?: string }
> {
  const started = Date.now();
  const name = String(input.name ?? "").trim();
  if (!name) return { error: "no-name", ok: false };
  if (!input.bytes?.length) return { error: "empty-file", ok: false };

  let summary = String(input.summary ?? "").trim();
  let d: Extract<Described, { ok: true }> | null = null;
  if (!summary) {
    const r = (await describe({ bytes: input.bytes, mime: input.mime, name })) as unknown as Described;
    if (!r.ok) return { error: r.refusal, ok: false, ...(r.why ? { why: r.why } : {}) };
    d = r;
    summary = r.summary;
  }

  const source = input.source || "api";
  const title = input.title ?? d?.title ?? name;
  const kept = await keep({
    about: summary,
    anchors: input.anchors ?? d?.anchors,
    author: input.author,
    bytes: input.bytes,
    described_by: d?.described_by,
    describe_ms: d?.ms,
    full: input.full ?? d?.full,
    language: d?.language,
    mime: input.mime,
    name,
    source,
    tags: input.tags ?? d?.tags,
    title,
    // 🔒 ПУСТОЙ `who` НЕ СТАНОВИТСЯ «stand»: так `keep()` помечает стенд, а объект пришёл не оттуда.
    who: input.who || source,
  });
  if (!kept.ok) return kept;
  return {
    card: kept.card,
    described: d !== null,
    kind: messageKindOf(kindOf(name, input.mime) ?? "text", name),
    messageId: kept.messageId,
    ms: Date.now() - started,
    ok: true,
    summary,
    title,
  };
}
