<!-- refreshed: 2026-06-01 -->
<!-- last_mapped_commit: 9aadfa0dd0f09fb5d364ab388fbc6853608b3665 -->
# Estrutura do Codebase

**Data da Análise:** 2026-06-01

## Layout de Diretórios

```
Acompanhamento-de-motoristas/
├── .github/
│   └── workflows/
│       ├── deploy-gh-pages.yml     # CI: deploy automático no push para main
│       └── deploy.yml              # CI alternativo (legado)
├── .planning/                      # Documentos de planejamento (gerados por agentes)
│   └── codebase/                   # Mapas do codebase
├── components/                     # Componentes React da aplicação
│   ├── ui/                         # Componentes de UI reutilizáveis (design system)
│   │   ├── Button.tsx              # Botão com variantes primary/secondary
│   │   ├── Card.tsx                # Container de cartão com borda e sombra
│   │   ├── Checkbox.tsx            # Checkbox estilizado
│   │   ├── DateInput.tsx           # Input de data com máscara
│   │   ├── DynamicField.tsx        # Renderizador dinâmico por tipo de campo
│   │   ├── Input.tsx               # Input de texto com label
│   │   ├── RadioGroup.tsx          # Grupo de radio buttons
│   │   ├── RatingSlider5.tsx       # Slider de rating escala 1-5
│   │   ├── Select.tsx              # Dropdown select com label
│   │   └── Textarea.tsx            # Textarea com label
│   ├── mn10/                       # Subsistema de formulários MN10
│   │   ├── MN10Dashboard.tsx       # CRUD de formulários MN10 + visualização de respostas
│   │   └── public/
│   │       └── MN10PublicFormPage.tsx  # Formulário público MN10 (rota sem autenticação)
│   ├── Dashboard.tsx               # Dashboard legado (usa mock evaluationService)
│   ├── DriverDashboard.tsx         # Análise individual por motorista
│   ├── EvaluationForm.tsx          # Formulário de avaliação (2 etapas)
│   ├── FormsViewer.tsx             # Visualizador de formulários preenchidos
│   ├── GeneralDashboard.tsx        # Dashboard geral com gráficos e filtros
│   ├── Login.tsx                   # Tela de login
│   ├── PrivateRoute.tsx            # Guarda de rota (redireciona não autenticados)
│   ├── RatingSlider.tsx            # Slider de rating escala 0-10
│   ├── TemplateManager.tsx         # Gestão de modelos, filiais e usuários (admin)
│   └── UserMigration.tsx           # Placeholder vazio (funcionalidade pendente)
├── contexts/
│   └── AuthContext.tsx             # Contexto de autenticação (Firebase Auth + perfil Firestore)
├── data/
│   └── exampleTemplates.ts         # Modelos de exemplo para demonstração
├── dist/                           # Build de produção (gitignored, gerado pelo Vite)
├── node_modules/                   # Dependências npm (gitignored)
├── public/                         # Arquivos públicos servidos diretamente
│   ├── .nojekyll                   # Impede processamento Jekyll no GitHub Pages
│   ├── 404.html                    # Página 404 para SPA no GitHub Pages
│   ├── ambiental.svg               # Logo da empresa
│   └── index.css                   # CSS global
├── scripts/                        # Scripts utilitários
│   ├── createAdminUser.js          # Placeholder vazio
│   ├── deploy-gh-pages.sh          # Script shell de deploy manual
│   └── migrateUsers.js             # Placeholder vazio
├── services/                       # Camada de serviços (Firebase + PDF)
│   ├── evaluationService.ts        # Mock legado (dados hardcoded em memória)
│   ├── firebaseService.ts          # CRUD Firestore: templates, evaluations, branches, users
│   ├── mn10PdfService.ts           # Geração de PDF para respostas MN10
│   ├── mn10Service.ts              # CRUD Firestore para formulários e respostas MN10
│   └── pdfService.ts               # Geração de PDF para avaliações
├── utils/                          # Funções utilitárias
│   ├── evaluationUtils.ts          # Cálculo de status de avaliação (aprovado/reprovado)
│   └── mn10FieldUtils.ts           # Máscaras e validação de data/telefone
├── .firebaserc                     # Configuração de projeto Firebase
├── .gitattributes                  # Configuração Git LFS/atributos
├── .gitignore                      # Arquivos ignorados pelo Git
├── AGENTS.md                       # Guia para agentes de IA (stack, arquitetura, convenções)
├── App.tsx                         # Componente raiz autenticado (layout de abas)
├── constants.ts                    # Constantes compartilhadas (critérios de avaliação legados)
├── firebase.json                   # Configuração de hosting e emuladores Firebase
├── firebase.ts                     # Inicialização dos SDKs Firebase (Auth, Firestore, Storage)
├── firestore.rules                 # Regras de segurança do Firestore
├── index.css                       # Estilos globais Tailwind (diretivas @tailwind)
├── index.html                      # Template HTML (ponto de entrada do Vite)
├── index.tsx                       # Ponto de entrada React (rotas, providers)
├── metadata.json                   # Metadados do projeto
├── package.json                    # Dependências e scripts npm
├── package-lock.json               # Lockfile de dependências
├── postcss.config.cjs              # Configuração PostCSS (Tailwind + Autoprefixer)
├── README.md                       # Documentação do projeto
├── storage.rules                   # Regras de segurança do Firebase Storage
├── tailwind.config.cjs             # Configuração Tailwind (cores brand, content paths)
├── tsconfig.json                   # Configuração TypeScript (strict, paths, noEmit)
├── types.ts                        # Fonte única de verdade para tipos TypeScript
├── vite-env.d.ts                   # Declarações de tipo para Vite
└── vite.config.ts                  # Configuração Vite (alias @, base path, env)
```

## Propósitos dos Diretórios

**`components/`:**
- Objetivo: Todos os componentes React da aplicação
- Contém: Componentes de página/feature (raiz), componentes de UI reutilizáveis (`ui/`), subsistema MN10 (`mn10/`)
- Arquivos chave: `App.tsx` (importa daqui), `index.tsx` (importa `PrivateRoute`, `MN10PublicFormPage`)

**`components/ui/`:**
- Objetivo: Design system — componentes de interface reutilizáveis e desacoplados de lógica de negócio
- Contém: 10 componentes atômicos (Button, Card, Checkbox, DateInput, DynamicField, Input, RadioGroup, RatingSlider5, Select, Textarea)
- Arquivos chave: Todos os componentes de feature importam de `./ui/`

**`components/mn10/`:**
- Objetivo: Subsistema independente de formulários públicos MN10
- Contém: Dashboard de gestão MN10 (`MN10Dashboard.tsx`) e formulário público (`public/MN10PublicFormPage.tsx`)
- Arquivos chave: `MN10Dashboard.tsx` (1154 linhas — componente mais complexo do sistema)

**`contexts/`:**
- Objetivo: Contextos React para estado global
- Contém: `AuthContext.tsx` — único contexto da aplicação
- Arquivos chave: `AuthContext.tsx` (151 linhas)

**`services/`:**
- Objetivo: Abstração de acesso a dados externos (Firebase) e geração de PDFs
- Contém: 5 arquivos de serviço
- Arquivos chave: `firebaseService.ts` (402 linhas), `mn10Service.ts` (815 linhas — maior arquivo do projeto)

**`utils/`:**
- Objetivo: Funções utilitárias compartilhadas (lógica pura, sem efeitos colaterais)
- Contém: 2 arquivos (`evaluationUtils.ts`, `mn10FieldUtils.ts`)
- Arquivos chave: `mn10FieldUtils.ts` (máscaras de data dd/mm/aaaa e telefone (xx)xxxxxxxxx)

**`data/`:**
- Objetivo: Dados estáticos e exemplos para referência
- Contém: `exampleTemplates.ts` (290 linhas com 2 modelos de exemplo)
- Arquivos chave: Usado por `TemplateManager.tsx` como modelos iniciais

**`public/`:**
- Objetivo: Arquivos estáticos servidos diretamente pelo Vite (acessíveis na raiz do site)
- Contém: Logo, CSS global compilado, página 404 para GitHub Pages SPA
- Arquivos chave: `ambiental.svg` (logo referenciada em `Login.tsx` e `pdfService.ts`)

**`scripts/`:**
- Objetivo: Scripts de utilidade e migração
- Contém: `deploy-gh-pages.sh`, `createAdminUser.js` (placeholder), `migrateUsers.js` (placeholder)
- Arquivos chave: Nenhum funcional atualmente

**`dist/`:**
- Objetivo: Build de produção gerado pelo Vite
- Contém: Bundle otimizado para deploy
- Gerado: Sim (via `npm run build`)
- Commitado: Não (gitignored)

## Localizações de Arquivos Chave

**Pontos de Entrada:**
- `index.html`: Template HTML raiz, carrega `index.tsx`
- `index.tsx`: Ponto de entrada React — monta App, define rotas e providers globais
- `App.tsx`: Componente principal autenticado — layout com header, abas de navegação, footer

**Configuração:**
- `vite.config.ts`: Configuração Vite (alias `@`, base path condicional, variáveis de ambiente)
- `tsconfig.json`: Configuração TypeScript (strict mode, paths, JSX react-jsx)
- `tailwind.config.cjs`: Cores brand customizadas e content paths do Tailwind
- `postcss.config.cjs`: Plugins PostCSS (Tailwind + Autoprefixer)
- `firebase.ts`: Inicialização SDK Firebase (API key pública)
- `firestore.rules`: Regras de segurança do Firestore
- `storage.rules`: Regras de segurança do Firebase Storage

**Lógica Principal:**
- `services/firebaseService.ts`: CRUD de avaliações, templates, filiais, usuários
- `services/mn10Service.ts`: CRUD de formulários e respostas MN10, upload de arquivos
- `contexts/AuthContext.tsx`: Autenticação, perfil do usuário, helpers de permissão
- `types.ts`: Todas as interfaces TypeScript do sistema

**Componentes de Feature:**
- `components/EvaluationForm.tsx`: Formulário de avaliação (489 linhas)
- `components/GeneralDashboard.tsx`: Dashboard geral com gráficos Recharts (414 linhas)
- `components/DriverDashboard.tsx`: Análise por motorista (591 linhas)
- `components/TemplateManager.tsx`: Gestão admin: modelos, filiais, usuários (1185 linhas)
- `components/mn10/MN10Dashboard.tsx`: Gestão MN10: formulários e respostas (1154 linhas)
- `components/mn10/public/MN10PublicFormPage.tsx`: Formulário público MN10 (432 linhas)

**Utilitários:**
- `utils/evaluationUtils.ts`: Status de avaliação (aprovado/reavaliar/reprovado)
- `utils/mn10FieldUtils.ts`: Máscaras de data, telefone, validação

**Dados Estáticos:**
- `data/exampleTemplates.ts`: 2 modelos de exemplo (entrevista de admissão, inspeção veicular)
- `constants.ts`: Lista legada de 21 critérios de avaliação

## Convenções de Nomenclatura

**Arquivos:**
- PascalCase para componentes React: `EvaluationForm.tsx`, `DriverDashboard.tsx`, `Button.tsx`
- camelCase para serviços, utilitários e configurações: `firebaseService.ts`, `evaluationUtils.ts`, `vite.config.ts`
- Prefixo descritivo para subsistema MN10: `mn10Service.ts`, `mn10PdfService.ts`, `mn10FieldUtils.ts`
- `.cjs` para arquivos CommonJS (Tailwind/PostCSS): `tailwind.config.cjs`, `postcss.config.cjs`
- `index.tsx` no ponto de entrada (não `main.tsx` ou `app.tsx`)

**Diretórios:**
- `components/ui/`: Subdiretório para design system
- `components/mn10/`: Subdiretório para subsistema específico
- `components/mn10/public/`: Subdiretório para rota pública do subsistema
- `services/`: Plural para camada de serviços
- `utils/`: Abreviação padrão para utilitários

**Funções (Inglês, camelCase):**
- Verbos de ação: `getTemplates`, `saveEvaluation`, `createMn10Form`, `deleteUser`
- Helpers booleanos: `canManageSystem`, `canAccessMN10`, `isInternalQuestion`
- Funções utilitárias: `applyDateMask`, `formatAnswerValue`, `normalizeQuestions`

**Variáveis/Tipos (Inglês):**
- Interfaces: PascalCase — `Evaluation`, `EvaluationTemplate`, `MN10Form`, `MN10Response`
- Tipos union: PascalCase — `FieldType`, `UserRole`, `MN10FormStatus`, `MN10QuestionType`
- Constantes: UPPER_SNAKE_CASE — `EVALUATION_CRITERIA`, `DEFAULT_TEMPLATE_ID`, `MN10_FORMS_COLLECTION`

## Onde Adicionar Novo Código

**Nova Funcionalidade (ex: nova tela/feature):**
- Código principal: `components/MinhaFeature.tsx`
- Testes: *(não há diretório de testes configurado)*
- Tipos: Adicionar interfaces em `types.ts`
- Serviço Firebase: Adicionar funções em `services/` (novo arquivo ou estender existente)

**Novo Componente de UI:**
- Implementação: `components/ui/NovoComponente.tsx`
- Seguir padrão: props tipadas, variantes via prop `variant`, className merging, Tailwind

**Novo Serviço Firebase:**
- Implementação: `services/novoServico.ts`
- Seguir padrão: importar `db`/`auth`/`storage` de `firebase.ts`, funções async, mensagens de erro em português

**Utilitários Compartilhados:**
- Helpers puros: `utils/novoUtils.ts`

**Dados Estáticos/Exemplos:**
- Templates de exemplo: `data/novosExemplos.ts`

**Configuração:**
- Variáveis de ambiente: arquivo `.env` na raiz (prefixo `VITE_` ou `GEMINI_`), acessar via `import.meta.env`
- Rotas: adicionar `<Route>` em `index.tsx`
- Abas do App: adicionar ao tipo `Tab` e ao switch em `App.tsx`

## Diretórios Especiais

**`node_modules/`:**
- Objetivo: Dependências npm instaladas
- Gerado: Sim (via `npm install`)
- Commitado: Não (gitignored)

**`dist/`:**
- Objetivo: Build de produção (bundle Vite)
- Gerado: Sim (via `npm run build`)
- Commitado: Não (gitignored; deploy via `gh-pages` branch)

**`.planning/`:**
- Objetivo: Documentos de planejamento e mapas do codebase gerados por agentes
- Gerado: Sim (via comandos GSD como `/gsd-map-codebase`)
- Commitado: Sim (parte do repositório)

**`public/`:**
- Objetivo: Arquivos copiados diretamente para a raiz do build
- Gerado: Não (mantido manualmente)
- Commitado: Sim

---

*Análise de estrutura: 2026-06-01*
