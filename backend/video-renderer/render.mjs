/**
 * Render the TrainingVideo composition to MP4.
 *
 *   node render.mjs <props.json> <assets-dir> <output.mp4>
 *
 * Assets (images, narration, music) are served from <assets-dir> by a throwaway local
 * HTTP server, so props only carry file names. Progress is printed as JSON lines
 * ({"progress": 0.42}) for the Python backend to relay to the app.
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Set in the Docker image, where the bundle is built once at image build time (npm run bundle).
const PREBUILT_BUNDLE = process.env.REMOTION_BUNDLE_DIR;
const BUNDLE_CACHE_DIR = path.join(HERE, '.bundle-cache');
const COMPOSITION_ID = 'TrainingVideo';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

function serveDirectory(dir) {
  const server = createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1));
    const file = path.join(dir, name);
    if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    const size = statSync(file).size;
    const headers = {
      'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };
    // Range support lets the video decoder seek instead of streaming whole clips.
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, 'Content-Length': size });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Webpack bundling takes ~30-45s, so reuse a bundle until the sources change. */
async function getServeUrl() {
  if (PREBUILT_BUNDLE && existsSync(PREBUILT_BUNDLE)) return PREBUILT_BUNDLE;

  const srcDir = path.join(HERE, 'src');
  const hash = createHash('sha1');
  for (const file of readdirSync(srcDir, { recursive: true }).map(String).sort()) {
    const full = path.join(srcDir, file);
    if (statSync(full).isFile()) hash.update(file).update(readFileSync(full));
  }
  const outDir = path.join(BUNDLE_CACHE_DIR, hash.digest('hex').slice(0, 12));
  if (existsSync(path.join(outDir, 'index.html'))) return outDir;
  return bundle({ entryPoint: path.join(srcDir, 'index.ts'), outDir });
}

async function main() {
  const [propsPath, assetsDir, outputPath] = process.argv.slice(2);
  if (!propsPath || !assetsDir || !outputPath) {
    console.error('Usage: node render.mjs <props.json> <assets-dir> <output.mp4>');
    process.exit(2);
  }

  const server = await serveDirectory(path.resolve(assetsDir));
  try {
    const inputProps = {
      ...JSON.parse(readFileSync(propsPath, 'utf8')),
      assetBaseUrl: `http://127.0.0.1:${server.address().port}`,
    };

    const serveUrl = await getServeUrl();

    const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps });

    let lastReported = -1;
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      audioCodec: 'aac',
      pixelFormat: 'yuv420p',
      outputLocation: outputPath,
      inputProps,
      // Measured on a 12-thread laptop: ~4 parallel tabs is fastest; more tabs fight over video decoding.
      concurrency: Number(process.env.RENDER_CONCURRENCY) || Math.min(4, os.cpus().length),
      crf: 23, // visually clean, ~40% smaller than the default: faster to stream on mobile data
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct !== lastReported) {
          lastReported = pct;
          console.log(JSON.stringify({ progress }));
        }
      },
    });

    console.log(JSON.stringify({ done: true, durationInFrames: composition.durationInFrames, fps: composition.fps }));
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err?.stack ?? String(err));
  process.exit(1);
});
