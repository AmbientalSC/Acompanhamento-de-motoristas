// Gera styles/tabler-icons.css e components/ui/iconNames.ts a partir do Tabler Icons (outline).
//
// Uso: npm run icons
// Para usar um ícone novo: acrescente o nome (kebab-case, igual ao catálogo em https://tabler.io/icons)
// na lista ICONS abaixo, rode o script e commite os arquivos gerados.
//
// Por que máscara CSS: o ícone herda `currentColor` (acompanha hover, :disabled e erro), não faz
// requisição extra e só leva os ícones realmente usados (em vez dos ~5.800 do catálogo).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLER_VERSION = '3.34.0';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ICONS = [
  'alert-circle',
  'alert-triangle',
  'arrow-down',
  'arrow-left',
  'arrow-up',
  'building',
  'calendar',
  'calendar-event',
  'camera',
  'chart-bar',
  'chart-pie',
  'check',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'circle-check',
  'circle-plus',
  'circle-x',
  'clipboard-list',
  'clock',
  'copy',
  'device-floppy',
  'dots',
  'download',
  'eye',
  'eye-off',
  'file-plus',
  'file-spreadsheet',
  'file-text',
  'filter',
  'grip-vertical',
  'id',
  'info-circle',
  'layout-dashboard',
  'link',
  'loader-2',
  'lock',
  'login',
  'logout',
  'medal',
  'menu-2',
  'pencil',
  'phone',
  'photo',
  'photo-off',
  'photo-plus',
  'plus',
  'refresh',
  'rotate',
  'search',
  'send',
  'settings',
  'share',
  'trash',
  'trending-down',
  'trending-up',
  'upload',
  'user',
  'user-search',
  'users',
  'x',
  'zoom-in',
  'zoom-out',
];

const svgUrl = name =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@${TABLER_VERSION}/icons/outline/${name}.svg`;

async function fetchIconBody(name) {
  const response = await fetch(svgUrl(name));
  if (!response.ok) {
    throw new Error(`Ícone "${name}" não encontrado no Tabler ${TABLER_VERSION} (HTTP ${response.status}).`);
  }
  const svg = await response.text();
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<path stroke="none"[^>]*\/>/, '') // caixa de contorno 24x24 do Tabler
    .replace(/\s+/g, ' ')
    .trim();
  return inner;
}

const toDataUri = inner => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' ` +
    `stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${inner.replace(/"/g, "'")}</svg>`;
  return `data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}`;
};

const bodies = await Promise.all(ICONS.map(async name => [name, await fetchIconBody(name)]));

const css = `/* GERADO por scripts/generate-tabler-icons.mjs (Tabler Icons ${TABLER_VERSION}, outline, MIT). Não edite à mão. */
/* Sem @layer: o Tailwind descartaria .ti-* (nomes montados em runtime). Importado antes de @tailwind utilities,
   então as classes de tamanho (h-4 w-4) vencem o tamanho padrão de .ti. */
.ti {
  display: inline-block;
  flex: 0 0 auto;
  width: var(--ti-size, 1.15em);
  height: var(--ti-size, 1.15em);
  vertical-align: -0.18em;
  background-color: currentColor;
  -webkit-mask: var(--ti) center / contain no-repeat;
  mask: var(--ti) center / contain no-repeat;
}
${bodies.map(([name, inner]) => `.ti-${name} { --ti: url("${toDataUri(inner)}"); }`).join('\n')}
`;

const names = `// GERADO por scripts/generate-tabler-icons.mjs. Não edite à mão.
export const ICON_NAMES = [
${ICONS.map(name => `  '${name}',`).join('\n')}
] as const;

export type IconName = (typeof ICON_NAMES)[number];
`;

await mkdir(path.join(ROOT, 'styles'), { recursive: true });
await writeFile(path.join(ROOT, 'styles', 'tabler-icons.css'), css, 'utf8');
await writeFile(path.join(ROOT, 'components', 'ui', 'iconNames.ts'), names, 'utf8');

console.log(`${ICONS.length} ícones gerados (${(css.length / 1024).toFixed(1)} KB de CSS).`);
