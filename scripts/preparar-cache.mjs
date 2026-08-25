// ============================================================
//  preparar-cache — contorna uma limitação do electron-builder
//  no Windows.
//
//  O pacote "winCodeSign" (de onde sai o rcedit, usado para
//  gravar ícone e metadados no .exe) traz dentro symlinks das
//  ferramentas de macOS. Criar symlink no Windows exige o
//  privilégio SeCreateSymbolicLink, que uma conta comum não
//  tem, e o 7-Zip aborta a extração inteira por causa disso.
//
//  Aqui o pacote é baixado e extraído sem as pastas darwin e
//  linux — inúteis para gerar um instalador Windows — e o
//  resultado é colocado direto no cache, de onde o
//  electron-builder o consome sem tentar baixá-lo de novo.
//
//  A alternativa oficial é ligar o Modo de Desenvolvedor do
//  Windows (Configurações > Sistema > Para desenvolvedores),
//  que concede o privilégio e dispensa este script.
// ============================================================

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const VERSAO = '2.6.0';
const URL_PACOTE =
  `https://github.com/electron-userland/electron-builder-binaries/releases/download/` +
  `winCodeSign-${VERSAO}/winCodeSign-${VERSAO}.7z`;

const raiz  = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const cache = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache',
                        'winCodeSign', `winCodeSign-${VERSAO}`);

if (fs.existsSync(path.join(cache, 'rcedit-x64.exe'))) {
  console.log('  cache já preparado — nada a fazer');
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wcs-'));
const arq = path.join(tmp, 'winCodeSign.7z');

console.log(`  baixando ${URL_PACOTE}`);
const resposta = await fetch(URL_PACOTE);
if (!resposta.ok) throw new Error(`download falhou: HTTP ${resposta.status}`);
fs.writeFileSync(arq, Buffer.from(await resposta.arrayBuffer()));

const sevenZip = path.join(raiz, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
console.log('  extraindo (ignorando darwin/ e linux/)');
try {
  execFileSync(sevenZip, ['x', '-bso0', '-bsp0', '-y', arq, `-o${cache}`,
                          '-xr!darwin', '-xr!linux'], { stdio: 'inherit' });
} catch {
  // 7-Zip devolve código 1 ou 2 para avisos; o que importa é o rcedit ter saído.
}

fs.rmSync(tmp, { recursive: true, force: true });

if (!fs.existsSync(path.join(cache, 'rcedit-x64.exe'))) {
  throw new Error(`extração incompleta: rcedit-x64.exe não apareceu em ${cache}`);
}
console.log(`  ok  ${cache}`);
