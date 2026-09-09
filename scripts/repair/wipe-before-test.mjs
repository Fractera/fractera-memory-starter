// Очистка НОВОЙ памяти перед замером. Только её таблицы, только строки.
import { ourTables, sql } from "../../lib/store.mjs"

const tables = await ourTables()
console.log("таблиц новой памяти:", tables.length)
for (const t of tables) {
  const before = await sql(`SELECT COUNT(*) AS n FROM ${t}`)
  const n = before.ok && before.rows.length ? before.rows[0].n : "?"
  const r = await sql(`DELETE FROM ${t}`)
  console.log(`  ${r.ok ? "✓" : "🛑"} ${t}: было ${n} строк, стало 0`)
}
console.log("")
console.log("— проверка —")
for (const t of tables) {
  const c = await sql(`SELECT COUNT(*) AS n FROM ${t}`)
  console.log(`  ${t}: ${c.ok ? c.rows[0]?.n : "?"}`)
}
