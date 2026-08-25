// ============================================================
//  icone — gera build/icon.ico a partir de um SVG.
//
//  Reproduz o .brand-mark da interface: quadrado azul-marinho
//  com o "P" em branco. O "P" é desenhado como path, e não como
//  texto, para não depender das fontes instaladas na máquina.
// ============================================================

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const raiz = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const dir  = path.join(raiz, 'build');
fs.mkdirSync(dir, { recursive: true });

const AZUL = '#102a5c';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="52" fill="${AZUL}"/>
  <path fill="#fff" fill-rule="evenodd" d="
    M80 52 H150 A49 49 0 0 1 150 150 H116 V204 H80 Z
    M116 88 V114 H150 A13 13 0 0 0 150 88 Z"/>
</svg>`;

const tamanhos = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  tamanhos.map(t => sharp(Buffer.from(svg)).resize(t, t).png().toBuffer())
);

fs.writeFileSync(path.join(dir, 'icon.ico'), await pngToIco(pngs));
fs.writeFileSync(path.join(dir, 'icon.png'), pngs.at(-1));
fs.writeFileSync(path.join(dir, 'icon.svg'), svg);

console.log(`  ok  build/icon.ico  (${tamanhos.join(', ')} px)`);
