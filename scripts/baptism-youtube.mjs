// Busca los directos de botez en el canal de YouTube de la iglesia.
//
//   node scripts/baptism-youtube.mjs                 → canal oficial (church.config.ts)
//   node scripts/baptism-youtube.mjs UCxxxxxxxxxxxx  → otro canal
//
// Recorre TODA la lista de subidas (playlist `UU…`, incluye los directos ya
// emitidos) y además el buscador del canal, y lista los vídeos cuyo título o
// descripción hablen de botez, con fecha, id y título. Con eso se rellena
// `youtubeId` y `ministers` (del título: «Botez Nou Testamentar ( Ioan Szasz )»)
// en `core/baptisms.config.ts`. Ojo: «Botezul cu Duhul Sfânt» es otro tema
// (predicación), no un bautismo; las predicaciones SOBRE el botez tampoco se
// enlazan (decisión del 14/10/2026). Receta: docs/ai/34-baptisms.md.
//
// La clave de la API está restringida por Referer: se manda el de la web.
import { readFileSync } from 'node:fs';
import https from 'node:https';

const config = readFileSync('src/app/core/church.config.ts', 'utf8');
const KEY = config.match(/youtubeApiKey:\s*'([^']+)'/)[1];
const CHANNEL = process.argv[2] ?? config.match(/youtubeChannelId:\s*'([^']+)'/)[1];
const PATTERN = /botez|bautis|baptis/i;

const get = (url) =>
  new Promise((ok, ko) =>
    https
      .get(url, { headers: { Referer: 'https://elimarganda.com/' } }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => (res.statusCode < 300 ? ok(JSON.parse(data)) : ko(new Error(`${res.statusCode} ${data.slice(0, 200)}`))));
      })
      .on('error', ko),
  );

const api = 'https://www.googleapis.com/youtube/v3';
const found = new Map();
let total = 0;

let token = '';
do {
  const r = await get(`${api}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=UU${CHANNEL.slice(2)}&key=${KEY}${token ? `&pageToken=${token}` : ''}`);
  for (const it of r.items) {
    total++;
    const text = `${it.snippet.title} ${it.snippet.description}`;
    if (PATTERN.test(text)) {
      const date = (it.contentDetails.videoPublishedAt ?? it.snippet.publishedAt).slice(0, 10);
      found.set(it.contentDetails.videoId, `${date}  ${it.contentDetails.videoId}  ${it.snippet.title}`);
    }
  }
  token = r.nextPageToken;
} while (token);

for (const q of ['botez', 'botezul', 'bautismo']) {
  let page = '';
  do {
    const r = await get(`${api}/search?part=snippet&type=video&maxResults=50&channelId=${CHANNEL}&q=${q}&key=${KEY}${page ? `&pageToken=${page}` : ''}`);
    for (const it of r.items) {
      if (PATTERN.test(it.snippet.title) && !found.has(it.id.videoId)) {
        found.set(it.id.videoId, `${it.snippet.publishedAt.slice(0, 10)}  ${it.id.videoId}  ${it.snippet.title}  (sólo en búsqueda)`);
      }
    }
    page = r.nextPageToken;
  } while (page);
}

console.log(`Canal ${CHANNEL}: ${total} vídeos en subidas, ${found.size} sobre botez\n`);
for (const line of [...found.values()].sort().reverse()) console.log(line);
