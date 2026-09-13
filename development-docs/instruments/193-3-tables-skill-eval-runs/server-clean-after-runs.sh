# Уборка после прогона подагентами — по метке, со сверкой со снимком «до».
# 🔒 ОПЛАЧЕНО 2026-09-13: первая итерация 193-3 оставила в живой памяти владельца
# 6 колонок, 3 таблицы и 16 строк — у прибора уборка была, у прогона нет.
# Удаляется только то, чего не было в снимке И где нет ни одной строки не прогона.
# Снимок: /tmp/cols-before-193.txt, /tmp/tabs-before-193.txt (снят seed193.sh).
echo "===CLEAN_RUNS==="
SEC=$(grep '^DATA_SECRET=' /etc/fractera/secrets.env | cut -d= -f2- | tr -d '"')
R=person_who_owns_this_project
sq(){ curl -s -H "X-Data-Secret: $SEC" -H 'Content-Type: application/json' -d "{\"sql\":\"$1\"}" http://127.0.0.1:3300/db/migrate; }
num(){ sq "$1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).rows[0].n)}catch{console.log('ERR')}})"; }
cols(){ sq "SELECT sql FROM sqlite_master WHERE name = '$R'" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const t=JSON.parse(s).rows[0].sql;const inner=t.slice(t.indexOf('(')+1,t.lastIndexOf(')'));let d=0,c='',o=[];for(const ch of inner){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&d===0){o.push(c.trim());c=''}else c+=ch}o.push(c.trim());console.log(o.map(x=>x.split(/\s+/)[0]).join('\n'))})"; }
tabs(){ sq "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '${R}%'" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).rows.map(r=>r.name).join('\n')))"; }
for T in $(tabs | grep -vxF -f /tmp/tabs-before-193.txt); do
  N=$(num "SELECT COUNT(*) AS n FROM $T WHERE who NOT LIKE 'eval-193-%'")
  if [ "$N" = "0" ]; then printf "DROP TABLE $T -> "; sq "DROP TABLE $T"; echo; else echo "ОТКАЗ: в $T чужих строк $N"; fi
done
for C in $(cols | grep -vxF -f /tmp/cols-before-193.txt); do
  N=$(num "SELECT COUNT(*) AS n FROM $R WHERE $C IS NOT NULL AND who NOT LIKE 'eval-193-%'")
  if [ "$N" = "0" ]; then printf "DROP COLUMN $C -> "; sq "ALTER TABLE $R DROP COLUMN $C"; echo; else echo "ОТКАЗ: в $C чужих значений $N"; fi
done
for T in $(cat /tmp/tabs-before-193.txt); do printf "DELETE eval из $T -> "; sq "DELETE FROM $T WHERE who LIKE 'eval-193-%'"; echo; done
echo "--- сверка: лишних колонок $(cols | grep -vxcF -f /tmp/cols-before-193.txt) · пропавших $(grep -vxcF -f <(cols) /tmp/cols-before-193.txt) · лишних таблиц $(tabs | grep -vxcF -f /tmp/tabs-before-193.txt) · всего колонок $(cols | wc -l) · таблиц $(tabs | wc -l)"
echo "===CLEAN_RUNS_END==="
