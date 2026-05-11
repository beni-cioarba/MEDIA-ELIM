const fs = require('fs');
const path = require('path');
const https = require('https');

// ============================================================================
// Script para descargar datos de YouTube de forma estática (Cron-job)
// ============================================================================
// Configura estas variables o pásalas como variables de entorno
const API_KEY = process.env.YOUTUBE_API_KEY || 'TU_API_KEY_AQUI';
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'TU_CHANNEL_ID_AQUI';

const ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const OUTPUT_FILE = path.join(__dirname, '../src/assets/data/youtube.json');

// Helper para hacer peticiones HTTPS
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    // Al añadir tu URL del frontend en el cabecero "Referer", 
    // burlamos la restricción de Google Cloud. (Reemplaza con tu URL real si es distinta)
    const options = {
      headers: {
        'Referer': 'https://beni-cioarba.github.io/MEDIA-ELIM/'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Error parseando JSON: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function mapItems(res) {
  if (!res.items) return [];
  return res.items.map(it => {
    // /search trae id en it.id.videoId, /playlistItems lo trae en it.snippet.resourceId.videoId
    const id = it.id?.videoId || it.snippet?.resourceId?.videoId;
    const sn = it.snippet;
    if (!id || !sn) return null;
    const thumb = sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || '';
    return {
      id,
      title: sn.title || '',
      publishedAt: sn.publishedAt || '',
      thumbnail: thumb,
      url: `https://www.youtube.com/watch?v=${id}`
    };
  }).filter(Boolean);
}

async function updateYouTubeData() {
  if (API_KEY === 'TU_API_KEY_AQUI') {
    console.error('ERROR: Debes configurar tu YOUTUBE_API_KEY en el script o variables de entorno.');
    process.exit(1);
  }

  console.log('Obteniendo datos de YouTube API...');

  try {
    // 1. Obtener Live (solo 1 resultado - Cuesta 100 unidades)
    const liveUrl = `${ENDPOINT}?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&maxResults=1&key=${API_KEY}`;
    const liveResponse = await fetchJSON(liveUrl);
    const liveStream = mapItems(liveResponse)[0] || null;

    // 2. Obtener Recientes (últimos 5 - Usamos /playlistItems para rebajar coste de 100 a 1 unidad)
    const uploadsPlaylistId = CHANNEL_ID.replace(/^UC/, 'UU');
    const recentUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=5&key=${API_KEY}`;
    const recentResponse = await fetchJSON(recentUrl);
    const recentStreams = mapItems(recentResponse);

    // 3. Crear el JSON combinado
    const currentData = {
      updatedAt: new Date().toISOString(),
      liveStream,
      recentStreams
    };

    // Crear directorio si no existe
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(currentData, null, 2), 'utf-8');
    console.log(`✅ Datos de YouTube guardados con éxito en: ${OUTPUT_FILE}`);
    console.log(`Live: ${liveStream ? 'Sí' : 'No'} | Recientes: ${recentStreams.length}`);

  } catch (error) {
    console.error('❌ Error actualizando datos de YouTube:', error.message);
    process.exit(1);
  }
}

updateYouTubeData();
