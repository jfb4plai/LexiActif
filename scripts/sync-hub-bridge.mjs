// Recopie le bloc hub-bridge de src/lib/hubBridge.ts dans les fonctions api/ qui l'utilisent.
// Les fonctions api/ doivent rester autonomes (voir api/play-list.ts) : la source de vérité est src/lib/hubBridge.ts.
// Usage : node scripts/sync-hub-bridge.mjs   (le test src/lib/hubBridge.test.ts échoue si les copies divergent)
import { readFileSync, writeFileSync } from 'node:fs';

const MARKERS = /\/\/ <hub-bridge:begin>\n[\s\S]*?\/\/ <hub-bridge:end>/;
const source = readFileSync('src/lib/hubBridge.ts', 'utf8').replace(/\r\n/g, '\n').match(MARKERS);
if (!source) throw new Error('Marqueurs hub-bridge introuvables dans src/lib/hubBridge.ts');

for (const file of ['api/play-hub-student.ts', 'api/play-attempt.ts']) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (!MARKERS.test(text)) throw new Error(`Marqueurs hub-bridge introuvables dans ${file}`);
  writeFileSync(file, text.replace(MARKERS, () => source[0]));
  console.log(`synchronisé : ${file}`);
}
