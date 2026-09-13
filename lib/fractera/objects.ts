import { dataFetch, dataJson, dataService } from "./data-service";

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
  return TEXT_EXT.has(ext);
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
  score: number;
  /** Ниже порога: вернулось ближайшее, а не подходящее. */
  far: boolean;
};

type MediaRow = {
  created_at?: string;
  description?: string;
  id: string;
  mime_type?: string;
  name?: string;
  size?: number;
};

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

/**
 * Положить объект.
 *
 * 🔒 ДВЕ ЗАПИСИ ИДУТ ПАРОЙ ИЛИ НЕ ИДУТ ВОВСЕ. Файл без карточки не найдёт никто,
 * а карточка без файла приведёт к пустоте. Карточка не легла — файл удаляется
 * тем же вызовом, и наружу уходит отказ, а не половина успеха.
 */
export async function keep(input: {
  about: string;
  bytes: Uint8Array;
  mime: string;
  name: string;
}): Promise<{ ok: true; card: ObjectCard; cardChars: number; ms: number } | { ok: false; error: string }> {
  const name = String(input.name ?? "").trim();
  const about = String(input.about ?? "").trim();
  if (!name) return { error: "no-name", ok: false };
  if (!input.bytes?.length) return { error: "empty-file", ok: false };

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
  form.append("file", new Blob([input.bytes as BlobPart], { type: input.mime || "application/octet-stream" }), name);
  form.append("title", name);
  form.append("description", about);

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
    if (!res.ok || j.ok === false || !j.item?.id) return { error: "store-refused", ok: false };
    item = j.item;
  } catch {
    return { error: "store-unreachable", ok: false };
  }

  const content = text ? new TextDecoder("utf-8").decode(input.bytes) : null;
  const card = buildCard(name, about, content);

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
    await dataFetch(`/media/${item.id}`, { method: "DELETE" }).catch(() => undefined);
    return { error: "card-failed", ok: false };
  }

  return { card: cardOf(item), cardChars: card.length, ms: Date.now() - started, ok: true };
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
    const r = await dataJson<{ results?: { refId?: string; score: number }[] }>("/vectors/search", {
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
      hits.push({ ...cardOf(m), far: score < OBJECT_NEAR, score });
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
