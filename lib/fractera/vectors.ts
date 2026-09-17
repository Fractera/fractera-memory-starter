import { dataJson } from "./data-service";

// ВЕКТОРНОЕ ХРАНИЛИЩЕ — БЛИЗОСТЬ ПО СМЫСЛУ, КОГДА СЛОВА ДРУГИЕ.
//
// 🔒 ЖИВЁТ В СЛОЕ ДАННЫХ, А НЕ У НАС, И ЭТО ТА ЖЕ ДОРОГА, ЧТО У ГРАФА. Один
// адрес, один секрет, одна дверь, уже проверяющая права. Свой векторный склад
// внутри памяти означал бы второй экземпляр эмбеддингов и второй счёт за них.
//
// 🔒 ЧЕМ ОН ОТЛИЧАЕТСЯ ОТ ГРАФА — РАЗНИЦА НЕ В КАЧЕСТВЕ, А В ПРИРОДЕ ОТВЕТА.
// Граф отдаёт СВЯЗИ между сущностями: ответ собирается из нескольких записей.
// Вектор отдаёт КУСКИ ТЕКСТА, близкие по смыслу: ответ лежит в одном куске, и
// находится он тогда, когда слова вопроса и слова записи совсем разные.
//
// 🔒 И ГЛАВНОЕ ОТЛИЧИЕ ДЛЯ ПАМЯТИ: У ВЕКТОРА ЕСТЬ ЧИСЛО БЛИЗОСТИ, А У ГРАФА ЕГО
// НЕТ. Значит здесь можно отличить «нашёл» от «вернул ближайшее» — и это делает
// вектор единственным хранилищем, умеющим честно сказать «ничего подходящего».

/** Порог близости: ниже него находка считается посторонней. */
export const NEAR = 0.28;

// 🔒 ЧИСЛО ИЗМЕРЕНО НА СВОЁМ КОРПУСЕ 2026-09-12, А НЕ УНАСЛЕДОВАНО.
// Прибор `scripts/probe/vector-two-tests.mjs` дал две группы близостей:
//   верные вопросы  : 0.245 0.297 0.314 0.316 0.318 0.428 0.451
//   посторонние     : 0.120 0.152 0.247
// При 0.28 проходит 6 верных из 7 и не проходит ни один посторонний.
//
// ✗ ЧЕМ ЭТО ОПЛАЧЕНО: СНАЧАЛА ЗДЕСЬ СТОЯЛО 0.33, ВЗЯТОЕ У СОСЕДНЕЙ СЛУЖБЫ.
// На нашем корпусе оно отсекло ПЯТЬ ВЕРНЫХ ОТВЕТОВ ИЗ СЕМИ — испытание нашло
// это сразу, потому что мерка честная. Число было измерено там на саммари
// автоматизаций; здесь короткие русские абзацы, и шкала другая.
// 🔒 ЗАКОН ШИРЕ СЛУЧАЯ: ПОРОГ БЛИЗОСТИ — СВОЙСТВО КОРПУСА, А НЕ КОНСТАНТА
// ХРАНИЛИЩА. Перенесённый с чужих данных, он выглядит обоснованным (он и правда
// был измерен — только не здесь) и тихо делает половину верных находок
// невидимыми. Меняется язык, длина записей или их род — порог перемеряется.
//
// 🛑 И ЧЕСТНО О ПРЕДЕЛЕ: ГРУППЫ ПЕРЕКРЫВАЮТСЯ. Худший верный — 0.245, лучший
// посторонний — 0.247. Значит порога, который пропустит всё верное и отсечёт всё
// чужое, на этом корпусе НЕ СУЩЕСТВУЕТ, и 0.28 выбран в пользу чистоты: лучше
// потерять слабую находку, чем выдать постороннее за ответ. Цена названа, а не
// спрятана за красивым числом.

export type Piece = {
  id: string;
  score: number;
  text: string;
  /** Ниже порога: вернулось ближайшее, а не подходящее. */
  far: boolean;
};

/**
 * Положить кусок текста.
 *
 * 🔒 РЕЖЕМ НА КУСКИ МЫ, И ЭТО ИЗМЕРЕННОЕ СВОЙСТВО СКЛАДА: своей нарезки у него
 * нет, текст уезжает в эмбеддинг целиком. Значит длинный документ либо превысит
 * предел модели, либо размажет смысл по одному вектору — и поведение начнёт
 * зависеть от размера файла, а не от его содержания.
 */
export async function remember(input: {
  collection: string;
  id: string;
  text: string;
}): Promise<{ ok: boolean; dims?: number; error?: string }> {
  try {
    const r = await dataJson<{ dims?: number; ok?: boolean }>("/vectors", {
      body: JSON.stringify({
        collection: input.collection,
        id: input.id,
        refId: input.id,
        refTable: "memory_bench",
        text: input.text,
      }),
      method: "POST",
    });
    return { dims: r.dims, ok: r.ok !== false };
  } catch {
    return { error: "unreachable", ok: false };
  }
}

/**
 * Найти близкое по смыслу.
 *
 * 🔒 ПОРОГ ПРИМЕНЯЕТСЯ ЗДЕСЬ, А НЕ У ЗОВУЩЕГО, И ВОЗВРАЩАЕТСЯ ВМЕСТЕ С НАХОДКОЙ.
 * Склад отвечает всегда — у него нет пустого ответа, есть только «самое близкое
 * из того, что лежит». Не назвав дальнее дальним, мы получим уверенный неверный
 * ответ там, где честный ответ — «ничего подходящего».
 * 🛑 ДАЛЬНИЕ КУСКИ НЕ ВЫБРАСЫВАЮТСЯ, А ПОМЕЧАЮТСЯ. Выбросив их, мы отняли бы у
 * зовущего возможность увидеть, НАСКОЛЬКО далеко было ближайшее, — а это разные
 * ответы: «есть, но не то» и «склад пуст».
 */
export async function recall(input: {
  collection: string;
  k?: number;
  query: string;
}): Promise<{ ok: boolean; pieces: Piece[]; near: Piece[]; error?: string }> {
  try {
    const r = await dataJson<{ results?: { id: string; score: number; text: string }[] }>(
      "/vectors/search",
      {
        body: JSON.stringify({
          collection: input.collection,
          k: input.k ?? 5,
          query: input.query,
        }),
        method: "POST",
      },
    );
    const pieces: Piece[] = (r.results ?? []).map((p) => ({
      far: Number(p.score) < NEAR,
      id: String(p.id),
      score: Number(p.score),
      text: String(p.text ?? ""),
    }));
    return { near: pieces.filter((p) => !p.far), ok: true, pieces };
  } catch {
    return { error: "unreachable", near: [], ok: false, pieces: [] };
  }
}

/** Сколько лежит в коллекции и настроен ли склад вообще. */
export async function status(collection: string): Promise<{
  configured: boolean;
  count: number;
  dims: number;
  model: string;
  ok: boolean;
}> {
  try {
    const s = await dataJson<{
      configured?: boolean;
      dims?: number;
      model?: string;
    }>("/vectors/status");
    const c = await dataJson<{ rows?: { n?: number }[] }>("/db/migrate", {
      body: JSON.stringify({
        params: [collection],
        sql: "SELECT COUNT(*) AS n FROM vectors WHERE collection = ?",
      }),
      method: "POST",
    });
    return {
      configured: Boolean(s.configured),
      count: Number(c.rows?.[0]?.n ?? 0),
      dims: Number(s.dims ?? 0),
      model: String(s.model ?? ""),
      ok: true,
    };
  } catch {
    return { configured: false, count: 0, dims: 0, model: "", ok: false };
  }
}

/**
 * Забыть коллекцию целиком.
 *
 * 🛑 ИМЯ КОЛЛЕКЦИИ ОБЯЗАТЕЛЬНО И ПУСТЫМ НЕ БЫВАЕТ. `DELETE FROM vectors` без
 * условия стёр бы чужие записи вместе с нашими — а в этом складе живут не
 * только испытания стенда.
 */
export async function forget(collection: string): Promise<{ ok: boolean; removed: number }> {
  const c = String(collection ?? "").trim();
  if (!c) return { ok: false, removed: 0 };
  try {
    const r = await dataJson<{ changes?: number }>("/db/migrate", {
      body: JSON.stringify({
        params: [c],
        sql: "DELETE FROM vectors WHERE collection = ?",
      }),
      method: "POST",
    });
    return { ok: true, removed: Number(r.changes ?? 0) };
  } catch {
    return { ok: false, removed: 0 };
  }
}
