# Acompanhamento de Motoristas — Guia para Agentes

## Stack
- **Frontend**: React 19 + TypeScript + Vite 7
- **Estilo**: Tailwind CSS 3 (cores customizadas em `tailwind.config.cjs`)
- **Roteamento**: React Router DOM 7
- **Backend**: Firebase (Firestore, Auth, Storage) — sem API própria
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **PDF**: jsPDF + html2canvas
- **Deploy**: GitHub Pages (`gh-pages`)

## Comandos

```bash
npm run dev          # servidor local (Vite)
npm run build        # build de produção
npm run preview      # preview do build
npm run deploy       # build + deploy para gh-pages (branch gh-pages)
```

**CI**: push na `main` dispara deploy automático para GitHub Pages (`.github/workflows/`).

**Instalação no CI**: usar `npm install --legacy-peer-deps` (React 19 pode conflitar com peer dependencies).

## Arquitetura

### Ponto de entrada
- `index.html` -> `index.tsx` -> `App.tsx`
- `index.tsx` define rotas: `/mn10/f/:publicId` (público) e `/*` (autenticado via `PrivateRoute`)

### Dois sistemas de formulários independentes
1. **Formulários de avaliação** — modelos customizáveis com critérios dinâmicos (`components/EvaluationForm.tsx`, `components/DriverDashboard.tsx`, `components/GeneralDashboard.tsx`). Exigem autenticação.
2. **Formulários MN10** — formulários públicos com submissão anônima e campos internos (`components/mn10/`). Rota pública `/mn10/f/:publicId`.

### Camada de dados
- **`services/firebaseService.ts`** — serviço real (Firestore CRUD). Use este.
- **`services/evaluationService.ts`** — legado (mock com dados hardcoded). Não usar.
- **`services/mn10Service.ts`** — CRUD dos formulários MN10.
- **`services/pdfService.ts`** e **`services/mn10PdfService.ts`** — geração de PDFs.

### Tipos
- **`types.ts`** é a fonte única de verdade para todas as interfaces (`Evaluation`, `EvaluationTemplate`, `User`, `MN10Form`, `MN10Response`, etc).
- Nunca duplique tipos; sempre adicione em `types.ts`.

### Autenticação e permissões
- **`contexts/AuthContext.tsx`**: `useAuth()` retorna `currentUser` (Firebase), `systemUser` (perfil no Firestore), e helpers: `canManageSystem`, `canAccessMN10`, `canAccessBranch(branch)`, `isAdmin`, `isManager`.
- Roles: `admin` (gerencia tudo) e `manager` (acesso por filial).
- `PrivateRoute.tsx` protege rotas que exigem login.

### Componentes reutilizáveis
- `components/ui/`: `Button`, `Card`, `Checkbox`, `DateInput`, `DynamicField`, `Input`, `RadioGroup`, `Select`, `Textarea`.
- `components/RatingSlider.tsx`: grupo de botões 0-10 com código de cores.

### Alias de importação
- `@/` aponta para a raiz do projeto (configurado no `vite.config.ts` e `tsconfig.json`).

## Convenções

### Estilo de código
- Idioma do código e comentários: **português (PT-BR)**.
- Nomes de funções, variáveis e tipos: inglês (ex: `getTemplates`, `canManageSystem`, `EvaluationTemplate`).
- Strings de UI e mensagens de erro: português.

### Tailwind
- Cores do brand definidas em `tailwind.config.cjs`: `brand-primary` (#1E40AF), `brand-secondary` (#1D4ED8), `brand-accent` (#3B82F6), `brand-light` (#EFF6FF), `brand-dark` (#111827).
- Use `cjs` para arquivos de config do Tailwind/PostCSS.

### Firebase
- API key e config expostos em `firebase.ts` — isso é normal para Firebase client SDK.
- Projeto Firebase: `motoristas-f4aed`.
- Coleções Firestore: `templates`, `evaluations`, `branches`, `users`, `mn10Forms`, `mn10Responses`.
- Regras de segurança em `firestore.rules` e `storage.rules`.

### Paths e build
- Base path em produção: `/Acompanhamento-de-motoristas/` (GitHub Pages).
- Build de saída: `dist/`.
- SPA redirect: `404.html` + script inline no `index.html` para GitHub Pages.

## Armadilhas

- **Não há ESLint nem Prettier configurados** — não executar comandos de lint.
- **Não há testes configurados** — não tentar rodar `npm test`.
- **Três arquivos vazios** que são placeholders: `components/UserMigration.tsx`, `scripts/createAdminUser.js`, `scripts/migrateUsers.js`.
- **Arquivo `FORMULARIOS_CUSTOMIZAVEIS.md`** não foi encontrado no disco — pode estar ausente ou renomeado.
- **TypeScript estrito** (`strict: true`, `noUnusedLocals`, `noUnusedParameters` ativos).
- `allowImportingTsExtensions: true` e `noEmit: true` — imports devem incluir extensão `.ts`/`.tsx`.
- Não modificar `firestore.rules` ou `storage.rules` sem entender o modelo de permissões (MN10 tem regras específicas de acesso público).
