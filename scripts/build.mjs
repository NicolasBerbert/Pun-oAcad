// ============================================================
//  build — transpila os .jsx para .js antes de empacotar.
//
//  A versão web usa @babel/standalone e transpila os ~5.000
//  linhas de JSX a cada abertura. Aqui isso é feito uma vez só,
//  em tempo de build, com esbuild.
//
//  Importante: os arquivos NÃO são "bundled". Eles continuam
//  sendo scripts clássicos que compartilham o escopo global,
//  exatamente como na versão web — nenhum import/export foi
//  introduzido no código da aplicação.
// ============================================================

import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const raiz  = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const src   = path.join(raiz, 'src', 'app');
const saida = path.join(src, 'build');

fs.rmSync(saida, { recursive: true, force: true });
fs.mkdirSync(saida, { recursive: true });

const arquivos = fs.readdirSync(src).filter(f => /\.(jsx|js)$/.test(f));

for (const arq of arquivos) {
  const codigo = fs.readFileSync(path.join(src, arq), 'utf8');
  const jsx    = arq.endsWith('.jsx');

  const res = await esbuild.transform(codigo, {
    loader: jsx ? 'jsx' : 'js',
    // Chromium embarcado no Electron — sem necessidade de transpilar para ES5.
    target: 'chrome128',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    sourcefile: arq,
  });

  for (const aviso of res.warnings) {
    console.warn(`  aviso  ${arq}: ${aviso.text}`);
  }

  // App.jsx, Steps.jsx, HelperDiagrams.jsx e Viewer3D.jsx desestruturam
  // os hooks do React cada um por sua conta. Como são scripts clássicos
  // que dividem o mesmo escopo global, dois "const useState" seriam erro
  // de sintaxe. Na web isso não aparece porque o preset "env" do Babel
  // rebaixa tudo para var; aqui fazemos o mesmo, só nessa linha.
  const codigoFinal = res.code.replace(/^const (\{[^}]*\} = React;)$/m, 'var $1');

  fs.writeFileSync(path.join(saida, arq.replace(/\.jsx$/, '.js')), codigoFinal);
  console.log(`  ok  ${arq}`);
}

console.log(`\n${arquivos.length} arquivos transpilados para src/app/build/`);
