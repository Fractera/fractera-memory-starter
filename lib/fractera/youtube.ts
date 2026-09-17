import { youtubeApiKey } from "@/lib/architect/youtube-key";
import { chapterAt, parseChapters, secondsOfUrl, stampOfSeconds, youtubeId } from "@/lib/youtube-chapters.mjs";

// РОЛИК YOUTUBE ОФИЦИАЛЬНЫМ API: ДАННЫЕ, ГЛАВЫ, ОБЛОЖКА (195-4).
//
// 🎯 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-14: «Подтверждаю» на два потока — данные ролика ГАРАНТИРОВАННО официальным API по ключу, расшифровка отдельно и
// лучшей попыткой (195-12). Браузер здесь не участвует: `videos.list` стоит 1 единицу из 10 000 в день и отвечает за полсекунды.
//
// 🔒 ГЛАВЫ — ГЛАВНАЯ ЦЕННОСТЬ ЭТОГО ПУТИ. Они лежат в описании, и по ним память отвечает «на какой минуте про это говорили» без субтитров.
// Измерено на `BYXbuik3dgA`: 8 глав, 4119 с попадает в «xAI’s business plan».
// 🛑 ТЕКСТ СУБТИТРОВ ЭТОТ ПУТЬ НЕ ДАЁТ И НЕ ОБЕЩАЕТ: `captions.download` по ключу отвечает `401` «API keys are not supported by this API»
// (измерено). Флаг `caption` говорит лишь, что дорожки существуют.
//
// 🔒 ОТКАЗЫ СТАНДАРТИЗИРОВАНЫ ПО ДОКУМЕНТАЦИИ GOOGLE, А НЕ ПРИДУМАНЫ (слово владельца: «найди описание в каких случаях придёт отказ и
// стандартизируй этот отказ в нашем API от памяти»). Соответствие — в `YOUTUBE_REFUSALS`.

/** Отказы этого пути, каждый — со своей причиной и со своим лечением. */
export const YOUTUBE_REFUSALS = {
  /** Адрес не похож на ролик YouTube. */
  NOT_YOUTUBE: "not-youtube",
  /** Ключ не задан в настройках памяти. */
  KEY_MISSING: "youtube-key-missing",
  /** Google отверг ключ: `keyInvalid`, `keyExpired`, `ipRefererBlocked`, `forbidden`. */
  KEY_REJECTED: "youtube-key-rejected",
  /** `quotaExceeded`, `dailyLimitExceeded`, `rateLimitExceeded` — 10 000 единиц в день кончились или запросы слишком часто. */
  QUOTA: "youtube-quota",
  /** Ролика нет в ответе: удалён, приватный (`privacyStatus: private`) или адрес с опечаткой — API этих случаев не различает. */
  NOT_FOUND: "video-not-found",
  /** Иной отказ Google — код и слова едут наружу дословно. */
  REFUSED: "youtube-refused",
  /** Сеть до Google не дошла. */
  UNREACHABLE: "youtube-unreachable",
} as const;

export type Chapter = { seconds: number; stamp: string; title: string };

export type VideoRead =
  | {
      ok: true;
      id: string;
      watchUrl: string;
      askedSeconds: number | null;
      title: string;
      channel: string;
      publishedAt: string;
      duration: string;
      durationSeconds: number;
      description: string;
      tags: string[];
      language: string;
      captionTracksExist: boolean;
      views: number | null;
      privacy: string;
      regionRestricted: boolean;
      chapters: Chapter[];
      chapterOfAsked: Chapter | null;
      /** Самая крупная обложка, которая ОТВЕТИЛА: имя размера у API есть и у тех, которых на складе нет. */
      thumbnail: { height: number; name: string; url: string; width: number } | null;
      snapshot: string;
    }
  | { ok: false; error: string; why?: string };

/** Сколько знаков собственного описания автора берётся в снимок (195-13): первый абзац отвечает «о чём ролик», остальное — реклама и навигация. */
const DESCRIPTION_HEAD = 700;

/** `PT2H49M46S` → секунды. Не разобралось — 0. */
function secondsOfIso(iso: string): number {
  const m = String(iso ?? "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** Обложки, названные API, от крупной к мелкой. */
function orderedThumbnails(thumbs: Record<string, { url?: string; width?: number; height?: number }> | undefined) {
  const order = ["uhd", "qhd", "fhd", "maxres", "standard", "high", "medium", "default"];
  const out: { height: number; name: string; url: string; width: number }[] = [];
  for (const name of order) {
    const t = thumbs?.[name];
    if (t?.url) out.push({ height: Number(t.height ?? 0), name, url: t.url, width: Number(t.width ?? 0) });
  }
  return out;
}

/**
 * Первая обложка, которая РЕАЛЬНО отвечает.
 *
 * ✗ ОПЛАЧЕНО ПЕРВЫМ ЖЕ ПРОГОНОМ С КЛЮЧОМ (195-4): API назвал `fhd` 1920×1080, а `fhddefault.jpg` отдал `404` — причём телом в 1097 байт с
 * типом `image/jpeg`, то есть по содержимому это выглядит как картинка. Сохранив названное на слово, память положила бы заглушку вместо обложки.
 * 🔒 ЗАКОН ШИРЕ СЛУЧАЯ: АДРЕС, НАЗВАННЫЙ ЧУЖИМ API, ПРОВЕРЯЕТСЯ ФАКТОМ — так же, как адрес ресурса берётся из страницы, а не собирается по
 * шаблону. Первоисточник предупреждал словами «This image size is available for some videos», и проверка кода ответа стоит один запрос.
 * 🛑 ПРАВДУ ГОВОРИТ КОД ОТВЕТА, А НЕ ТЕЛО: тело у отказа — картинка.
 */
async function firstAvailableThumbnail(list: ReturnType<typeof orderedThumbnails>) {
  for (const t of list) {
    try {
      const r = await fetch(t.url, { cache: "no-store", method: "HEAD" });
      if (r.ok) return t;
    } catch {
      // Сеть до обложки не дошла — пробуем следующий размер.
    }
  }
  return null;
}

/** Снимок ролика — Markdown, который ложится объектом в память и читается моделью. */
function snapshotOfVideo(v: Extract<VideoRead, { ok: true }>): string {
  const lines = [
    `# ${v.title}`,
    "",
    `- Адрес: ${v.watchUrl}`,
    `- Канал: ${v.channel}`,
    `- Опубликовано: ${v.publishedAt}`,
    `- Длительность: ${stampOfSeconds(v.durationSeconds)} (${v.duration})`,
    `- Просмотров: ${v.views ?? "—"}`,
    `- Язык описания: ${v.language}`,
    `- Доступность: ${v.privacy}${v.regionRestricted ? ", есть ограничения по странам" : ""}`,
    `- Дорожки субтитров у ролика: ${v.captionTracksExist ? "есть (текст официальный API не отдаёт)" : "нет"}`,
    `- Снимок снят: ${new Date().toISOString()}`,
    `- Источник данных: YouTube Data API v3, videos.list`,
  ];
  if (v.thumbnail) {
    lines.push(`- Обложка: ${v.thumbnail.url} (${v.thumbnail.width}×${v.thumbnail.height}, размер «${v.thumbnail.name}», проверена ответом)`);
  } else {
    lines.push("- Обложка: ни один из названных API размеров не ответил");
  }
  if (v.askedSeconds !== null) {
    const c = v.chapterOfAsked;
    lines.push(
      `- Ссылка указывала на ${stampOfSeconds(v.askedSeconds)} (${v.askedSeconds} с)${c ? ` — это глава «${c.title}» с ${c.stamp}` : ""}`,
    );
  }
  lines.push("", `## Главы — ${v.chapters.length}`, "");
  if (v.chapters.length) {
    for (const c of v.chapters) lines.push(`- ${c.stamp} (${c.seconds} с) ${c.title}`);
  } else {
    // 🛑 ПУСТОЕ ГОВОРИТ ПОЧЕМУ: «глав нет» и «главы не разобрались» человек читает одинаково, если не сказать словами.
    lines.push("Автор не написал в описании оглавления с метками времени — значит по главам ответить нечем.");
  }
  // 🔒 ОТ ОПИСАНИЯ АВТОРА БЕРЁТСЯ НАЧАЛО, А НЕ ВСЁ (195-13, слово владельца «только описание и структуру»).
  // ✗ Оплачено записью 35: описание целиком уехало в снимок вместе со спонсорами, ссылками на подкаст-платформы и повтором глав — и полное
  // описание модели стало пересказом этого списка. Первый абзац отвечает на вопрос «о чём ролик»; остальное — реклама и навигация.
  const own = v.description.split(/\n\s*\n/)[0]?.trim() ?? "";
  lines.push("", "## Описание автора — начало", "", own ? own.slice(0, DESCRIPTION_HEAD) : "—");
  if (v.description.length > own.length) {
    lines.push("", `(в описании ещё ${v.description.length - own.length} знаков: ссылки, спонсоры, повтор глав — в снимок не входят)`);
  }
  if (v.tags.length) lines.push("", `## Теги — ${v.tags.length}`, "", v.tags.join(", "));
  return `${lines.join("\n")}\n`;
}

/**
 * Прочитать ролик по адресу. Ключ — из настроек памяти; браузер не зовётся.
 *
 * 🔒 ОТВЕТ GOOGLE ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP (закон 161): причина отказа лежит в теле, в `error.errors[].reason`.
 */
export async function readVideo(rawUrl: string): Promise<VideoRead> {
  const id = youtubeId(rawUrl);
  if (!id) return { error: YOUTUBE_REFUSALS.NOT_YOUTUBE, ok: false };
  const key = youtubeApiKey();
  if (!key) return { error: YOUTUBE_REFUSALS.KEY_MISSING, ok: false };

  let body: {
    error?: { errors?: { reason?: string }[]; message?: string };
    items?: Array<{
      contentDetails?: { caption?: string; duration?: string; regionRestriction?: unknown };
      snippet?: {
        channelTitle?: string;
        defaultAudioLanguage?: string;
        defaultLanguage?: string;
        description?: string;
        publishedAt?: string;
        tags?: string[];
        thumbnails?: Record<string, { url?: string; width?: number; height?: number }>;
        title?: string;
      };
      statistics?: { viewCount?: string };
      status?: { privacyStatus?: string };
    }>;
  };
  try {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${id}&key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    body = (await r.json().catch(() => ({}))) as typeof body;
  } catch (e) {
    return { error: YOUTUBE_REFUSALS.UNREACHABLE, ok: false, why: String((e as Error).message).slice(0, 200) };
  }

  if (body.error) {
    const reason = body.error.errors?.[0]?.reason ?? "";
    const why = String(body.error.message ?? reason).slice(0, 220);
    if (/quota|rateLimit|dailyLimit/i.test(reason)) return { error: YOUTUBE_REFUSALS.QUOTA, ok: false, why };
    if (/keyInvalid|keyExpired|ipRefererBlocked|forbidden|required|denied/i.test(reason)) {
      return { error: YOUTUBE_REFUSALS.KEY_REJECTED, ok: false, why };
    }
    if (/notFound|videoNotFound/i.test(reason)) return { error: YOUTUBE_REFUSALS.NOT_FOUND, ok: false, why };
    return { error: YOUTUBE_REFUSALS.REFUSED, ok: false, why: `${reason}: ${why}` };
  }

  const item = body.items?.[0];
  if (!item) {
    return {
      error: YOUTUBE_REFUSALS.NOT_FOUND,
      ok: false,
      why: "ролик удалён, приватный или в адресе опечатка — официальный API этих случаев не различает",
    };
  }

  const description = String(item.snippet?.description ?? "");
  const chapters = parseChapters(description) as Chapter[];
  const askedSeconds = secondsOfUrl(rawUrl) as number | null;
  const read = {
    askedSeconds,
    captionTracksExist: item.contentDetails?.caption === "true",
    chapterOfAsked: askedSeconds === null ? null : (chapterAt(askedSeconds, chapters) as Chapter | null),
    channel: String(item.snippet?.channelTitle ?? "—"),
    chapters,
    description,
    duration: String(item.contentDetails?.duration ?? ""),
    durationSeconds: secondsOfIso(String(item.contentDetails?.duration ?? "")),
    id,
    language: String(item.snippet?.defaultLanguage ?? item.snippet?.defaultAudioLanguage ?? "und"),
    ok: true as const,
    privacy: String(item.status?.privacyStatus ?? "unknown"),
    publishedAt: String(item.snippet?.publishedAt ?? ""),
    regionRestricted: Boolean(item.contentDetails?.regionRestriction),
    snapshot: "",
    tags: Array.isArray(item.snippet?.tags) ? item.snippet.tags.map(String) : [],
    thumbnail: await firstAvailableThumbnail(orderedThumbnails(item.snippet?.thumbnails)),
    title: String(item.snippet?.title ?? ""),
    views: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
    // 🔒 АДРЕС СОХРАНЯЕТСЯ КАНОНИЧЕСКИМ: `youtu.be/…`, `/shorts/…` и ссылка с меткой времени — один и тот же ролик, и повтор обязан это видеть.
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
  };
  return { ...read, snapshot: snapshotOfVideo(read) };
}
