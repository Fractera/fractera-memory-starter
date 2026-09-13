import type { StandSection } from "./test-tabs";

/**
 * Какие навыки показывает вкладка «Навык» у каждого стенда (194-19).
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Да, делай вкладки навыков» — на предложение: граф → `use-knowledge-graph`,
 * вектор → `use-vector-store`, тест памяти → `use-tables` + `use-depth-ladder`, объекты → к
 * `describe-incoming-object` добавить `use-object-store`.
 *
 * 🔒 ЕДИНСТВЕННЫЙ ИСТОЧНИК «СТЕНД → НАВЫКИ». Страница читает файлы по этим именам, вид рисует их в этом
 * порядке; второй список в разметке разошёлся бы с этим молча.
 * 🔒 ПОРЯДОК — ОТ ДЕЛА К ИНСТРУМЕНТУ: сначала навык, который делает работу стенда целиком (принять файл,
 * записать фразу), затем навык рук, которыми ищут.
 * 🛑 ИМЕНА ЗДЕСЬ — ТОЛЬКО ПАПКИ `.claude/skills/`. Они уходят в путь чтения файла, поэтому приходят из этой
 * константы, а не из адреса страницы.
 */
export const STAND_SKILLS: Record<StandSection, readonly string[]> = {
  "graph-test": ["use-knowledge-graph"],
  "memory-test": ["use-tables", "use-depth-ladder"],
  "object-test": ["describe-incoming-object", "use-object-store"],
  "vector-test": ["use-vector-store"],
};

export function skillsOf(section: StandSection): readonly string[] {
  return STAND_SKILLS[section];
}
