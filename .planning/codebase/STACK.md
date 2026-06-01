---
last_mapped_commit: 9aadfa0dd0f09fb5d364ab388fbc6853608b3665
mapped_at: 2026-06-01
focus: tech
---

# Stack Tecnológico

**Data da Análise:** 2026-06-01

## Linguagens

**Primária:**
- TypeScript ~5.8.2 — Todo o código-fonte da aplicação (`*.ts`, `*.tsx`)
  - Configuração: `tsconfig.json`
  - Modo estrito (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`)
  - Target: ES2020, Module: ESNext, JSX: react-jsx

**Secundária:**
- JavaScript — Scripts auxiliares em `scripts/` (Node.js)
- CSS (Tailwind) — Estilização via classes utilitárias em `index.css` e componentes

## Runtime & Build

**Dev Server / Bundler:**
- Vite 7.3.1 — Servidor de desenvolvimento com HMR e build de produção
  - Configuração: `vite.config.ts`
  - Output: `dist/`
  - Base path em produção: `/Acompanhamento-de-motoristas/` (GitHub Pages)
  - Dev path: `/`

**Módulo:**
- ESM (`"type": "module"` em `package.json`)
- Importações de extensão `.ts`/`.tsx` habilitadas (`allowImportingTsExtensions: true`)
- Sem emissão de JS (`noEmit: true`) — Vite gerencia a transpilação

**Package Manager:**
- npm — `package.json` + `package-lock.json` (presente)
- Comando de instalação no CI: `npm install --legacy-peer-deps` (devido a conflitos com React 19)

## Frameworks

**Core:**
- React 19.1.0 — Biblioteca de UI
- React DOM 19.1.0 — Renderização no DOM
- React Router DOM 7.13.0 — Roteamento SPA (BrowserRouter)

**Estilização:**
- Tailwind CSS 3.4.17 — Framework CSS utilitário
  - Configuração: `tailwind.config.cjs`
  - Cores customizadas da marca:
    - `brand-primary`: #1E40AF
    - `brand-secondary`: #1D4ED8
    - `brand-accent`: #3B82F6
    - `brand-light`: #EFF6FF
    - `brand-dark`: #111827
- PostCSS 8.5.6 — Processamento CSS
  - Configuração: `postcss.config.cjs`
  - Plugins: `tailwindcss`, `autoprefixer` (10.4.24)
- Fonte: Inter (Google Fonts, importada via CDN em `index.css`)

**Gráficos:**
- Recharts 3.1.0 — Gráficos e dashboards (usado em `GeneralDashboard.tsx` e `DriverDashboard.tsx`)

**Ícones:**
- Lucide React 0.528.0 — Biblioteca de ícones (usada em toda a aplicação)

**Geração de PDF:**
- jsPDF 4.1.0 — Geração de PDFs (relatórios de avaliação e formulários MN10)
- html2canvas 1.4.1 — Captura de elementos HTML para inclusão em PDFs
  - Serviços: `services/pdfService.ts`, `services/mn10PdfService.ts`

**Build/Deploy:**
- gh-pages 6.1.1 — Publicação do `dist/` no branch `gh-pages`
- TypeScript ~5.8.2 — Compilador/type-checker

## Backend (Firebase)

**Plataforma:** Firebase (SDK Web JS v12.0.0)

**Serviços Firebase utilizados:**
- **Firebase Auth** — Autenticação (email/senha)
- **Firestore** — Banco de dados NoSQL (documentos/coleções)
- **Firebase Storage** — Upload de arquivos (anexos de formulários MN10)
- **Firebase Analytics** — Monitoramento de uso

**Configuração Firebase:** `firebase.ts`
- Projeto: `motoristas-f4aed`
- Inicialização do Firestore com `experimentalForceLongPolling: true` (compatibilidade com certos ambientes)

**Regras de segurança:**
- `firestore.rules` — Regras de acesso ao Firestore
- `storage.rules` — Regras de acesso ao Storage

## Dependências Chave

| Pacote | Versão | Função |
|--------|--------|--------|
| `firebase` | ^12.0.0 | Backend completo (Auth, Firestore, Storage, Analytics) |
| `react` | ^19.1.0 | Biblioteca de UI |
| `react-dom` | ^19.1.0 | Renderização DOM |
| `react-router-dom` | ^7.13.0 | Roteamento SPA |
| `recharts` | ^3.1.0 | Visualização de dados (gráficos) |
| `lucide-react` | ^0.528.0 | Ícones |
| `jspdf` | ^4.1.0 | Geração de PDF |
| `html2canvas` | ^1.4.1 | Renderização HTML para canvas (PDFs) |
| `tailwindcss` | ^3.4.17 | Framework CSS |
| `vite` | ^7.3.1 | Build tool e dev server |
| `typescript` | ~5.8.2 | Type checker |

## Configuração de Build

**Vite** (`vite.config.ts`):
```typescript
// Path alias
resolve: { alias: { '@': path.resolve(__dirname, '.') } }

// Base path condicional
base: mode === 'production' ? '/Acompanhamento-de-motoristas/' : '/'

// Variáveis de ambiente injetadas no bundle
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

**TypeScript** (`tsconfig.json`):
- `moduleResolution: "bundler"` — Resolução de módulos otimizada para Vite
- `isolatedModules: true` — Compatível com transpilação isolada do Vite
- Path alias: `@/*` → `./*`

## Estrutura de Diretórios

```
projeto/
├── index.html          # Entry point HTML
├── index.tsx           # Entry point React (rotas, providers)
├── App.tsx             # Componente raiz com navegação por abas
├── firebase.ts         # Inicialização do Firebase SDK
├── types.ts            # Tipos TypeScript centralizados
├── constants.ts        # Constantes da aplicação
├── components/         # Componentes React
│   ├── ui/             # Componentes de UI reutilizáveis
│   └── mn10/           # Componentes específicos do MN10
├── contexts/           # Contextos React (AuthContext)
├── services/           # Serviços (Firebase, PDF, MN10)
├── utils/              # Utilitários
├── public/             # Assets públicos
├── scripts/            # Scripts auxiliares
└── dist/               # Build de produção (não commitado)
```

## Ambiente de Desenvolvimento

**Requisitos:**
- Node.js 18+ (CI usa Node 18)
- npm

**Comandos:**
```bash
npm run dev          # Servidor local (Vite HMR)
npm run build        # Build de produção → dist/
npm run preview      # Preview local do build
npm run deploy       # Build + deploy para gh-pages
```

## Plataforma de Produção

**Hospedagem:** GitHub Pages (branch `gh-pages`)
- URL base: `/Acompanhamento-de-motoristas/`
- SPA redirect: Script inline em `index.html` + `404.html`

**CI/CD:**
- GitHub Actions (`.github/workflows/deploy.yml` e `deploy-gh-pages.yml`)
- Triggers: push na branch `main`
- Runner: ubuntu-latest
- Node.js: 18
- Instalação: `npm install --legacy-peer-deps`
- Deploy automático após build bem-sucedido

---

*Análise de stack: 2026-06-01*
