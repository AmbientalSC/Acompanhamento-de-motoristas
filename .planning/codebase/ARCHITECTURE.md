<!-- refreshed: 2026-06-01 -->
<!-- last_mapped_commit: 9aadfa0dd0f09fb5d364ab388fbc6853608b3665 -->
# Arquitetura

**Data da Análise:** 2026-06-01

## Visão Geral do Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser (SPA React 19)                           │
├───────────────────────┬───────────────────────┬─────────────────────────┤
│   Rotas Públicas      │   Rotas Autenticadas  │     Firebase Services   │
│  `index.tsx:22`        │   `index.tsx:23-29`   │                         │
├────────────────────────┼───────────────────────┼─────────────────────────┤
│ MN10PublicFormPage     │  App.tsx              │  firebaseService.ts     │
│ `components/mn10/      │  ├─ EvaluationForm    │  mn10Service.ts         │
│  public/`              │  ├─ GeneralDashboard  │  pdfService.ts          │
│                        │  ├─ DriverDashboard   │  mn10PdfService.ts      │
│                        │  ├─ TemplateManager   │                         │
│                        │  └─ MN10Dashboard     │                         │
└────────┬───────────────┴───────────┬───────────┴──────────┬──────────────┘
         │                           │                       │
         ▼                           ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Firebase (Backend como Serviço)                       │
│  `firebase.ts`                                                          │
├──────────────────────┬──────────────────────┬───────────────────────────┤
│  Firebase Auth       │  Firestore           │  Firebase Storage         │
│  (autenticação)      │  (banco de dados)    │  (uploads de arquivos)    │
│                      │  ├─ templates        │  mn10/uploads/            │
│                      │  ├─ evaluations      │                           │
│                      │  ├─ branches         │                           │
│                      │  ├─ users            │                           │
│                      │  ├─ mn10Forms        │                           │
│                      │  └─ mn10Forms/{id}   │                           │
│                      │     /responses       │                           │
└──────────────────────┴──────────────────────┴───────────────────────────┘
```

## Responsabilidades dos Componentes Principais

| Componente | Responsabilidade | Arquivo |
|-----------|----------------|------|
| `index.tsx` | Ponto de entrada da aplicação, rotas, providers globais | `index.tsx` |
| `App.tsx` | Layout principal autenticado, navegação por abas, header/footer | `App.tsx` |
| `AuthProvider` | Estado de autenticação, permissões, login/logout | `contexts/AuthContext.tsx` |
| `PrivateRoute` | Guarda de rota — redireciona para Login se não autenticado | `components/PrivateRoute.tsx` |
| `Login` | Tela de login com email/senha via Firebase Auth | `components/Login.tsx` |
| `EvaluationForm` | Formulário de avaliação em 2 etapas: seleção de modelo → preenchimento com scores | `components/EvaluationForm.tsx` |
| `GeneralDashboard` | Dashboard geral com gráficos Recharts, filtros por filial/turno/modelo/data | `components/GeneralDashboard.tsx` |
| `DriverDashboard` | Análise individual por motorista, visão de avaliações e formulários | `components/DriverDashboard.tsx` |
| `TemplateManager` | CRUD de modelos de avaliação, filiais e usuários (admin) | `components/TemplateManager.tsx` |
| `MN10Dashboard` | CRUD de formulários MN10, visualização de respostas, campos internos | `components/mn10/MN10Dashboard.tsx` |
| `MN10PublicFormPage` | Formulário público MN10 acessível sem login via rota `/mn10/f/:publicId` | `components/mn10/public/MN10PublicFormPage.tsx` |
| `FormsViewer` | Visualização de formulários preenchidos (sem scores) | `components/FormsViewer.tsx` |
| `Dashboard` | Dashboard legado (usa mock `evaluationService`) | `components/Dashboard.tsx` |

## Visão Geral do Padrão Arquitetural

**Padrão geral:** Single Page Application (SPA) com backend como serviço (Firebase BaaS)

**Características principais:**
- Arquitetura sem servidor próprio — toda lógica de backend é delegada ao Firebase (Auth, Firestore, Storage)
- Dois subsistemas de formulários independentes que compartilham infraestrutura Firebase
- Estado de autenticação centralizado via React Context API
- Componentes de UI com estado local (useState/useEffect), sem gerenciador de estado global além do contexto de auth
- Roteamento client-side com React Router DOM, dois tipos de rota: pública (MN10) e protegida (todo o resto)

## Camadas

**Camada de Roteamento:**
- Objetivo: Definir rotas públicas e protegidas da aplicação
- Localização: `index.tsx` (linhas 21-31)
- Contém: Definições de `<Route>`, providers globais (`BrowserRouter`, `AuthProvider`)
- Depende de: React Router DOM, `AuthContext`, `PrivateRoute`
- Usado por: Toda a aplicação

**Camada de Contexto/Autenticação:**
- Objetivo: Gerenciar estado de autenticação Firebase e perfil do usuário no Firestore
- Localização: `contexts/AuthContext.tsx`
- Contém: `AuthProvider`, hook `useAuth()`, funções `login`/`logout`, helpers de permissão (`canManageSystem`, `canAccessMN10`, `canAccessBranch`)
- Depende de: `firebase.ts` (auth), `firebaseService.ts` (getUsers, ensureUserDocumentByAuthUID)
- Usado por: `PrivateRoute.tsx`, `App.tsx`, `TemplateManager.tsx`, `MN10Dashboard.tsx`

**Camada de Componentes de Página/Feature:**
- Objetivo: Componentes de tela completa que implementam funcionalidades do sistema
- Localização: `components/` (raiz) e `components/mn10/`
- Contém: `EvaluationForm`, `GeneralDashboard`, `DriverDashboard`, `TemplateManager`, `MN10Dashboard`, `MN10PublicFormPage`, `Login`, `FormsViewer`
- Depende de: `services/`, `components/ui/`, `utils/`, `contexts/AuthContext`
- Usado por: `App.tsx` (via renderização condicional por abas)

**Camada de Componentes de UI:**
- Objetivo: Componentes reutilizáveis de interface (design system)
- Localização: `components/ui/`
- Contém: `Button`, `Card`, `Checkbox`, `DateInput`, `DynamicField`, `Input`, `RadioGroup`, `RatingSlider5`, `Select`, `Textarea`
- Depende de: Tailwind CSS, tipos locais
- Usado por: Todos os componentes de feature

**Camada de Serviços:**
- Objetivo: Abstrair chamadas ao Firebase (Firestore, Storage) e lógica de PDF
- Localização: `services/`
- Contém:
  - `firebaseService.ts` — CRUD para templates, evaluations, branches, users (Firestore)
  - `mn10Service.ts` — CRUD para formulários MN10, respostas, uploads (Firestore + Storage)
  - `evaluationService.ts` — Mock legado com dados hardcoded (NÃO usar em produção)
  - `pdfService.ts` — Geração de PDF para avaliações (jsPDF)
  - `mn10PdfService.ts` — Geração de PDF para respostas MN10 (jsPDF)
- Depende de: `firebase.ts` (db, auth, storage), `types.ts`, `utils/`
- Usado por: Componentes de feature

**Camada de Utilitários:**
- Objetivo: Funções auxiliares compartilhadas
- Localização: `utils/`
- Contém: `evaluationUtils.ts` (status de avaliação por nota), `mn10FieldUtils.ts` (máscaras de data/telefone)
- Depende de: `types.ts` (apenas tipos)
- Usado por: Componentes e serviços

**Camada de Tipos:**
- Objetivo: Definição centralizada de todas as interfaces TypeScript
- Localização: `types.ts`
- Contém: `Evaluation`, `EvaluationTemplate`, `EvaluationCriterion`, `User`, `UserRole`, `MN10Form`, `MN10Response`, `MN10Question`, e tipos relacionados
- Usado por: Todo o código

**Camada de Configuração Firebase:**
- Objetivo: Inicialização e exportação dos serviços Firebase
- Localização: `firebase.ts`
- Contém: Inicialização do app Firebase, Auth, Firestore (com long polling), Storage
- Usado por: Serviços e AuthContext

## Fluxo de Dados

### Caminho Primário de Requisição (Formulário de Avaliação)

1. Usuário preenche formulário em `EvaluationForm.tsx` (estado local via `useState`)
2. Ao submeter, chama `saveEvaluation()` de `services/firebaseService.ts:119`
3. `saveEvaluation` escreve documento na coleção `evaluations` do Firestore com `addDoc` (`firebaseService.ts:131`)
4. Dashboards (`GeneralDashboard.tsx`, `DriverDashboard.tsx`) carregam dados via `getEvaluations()` (`firebaseService.ts:140`) que consulta Firestore com `orderBy('timestamp', 'desc')`
5. Dados são transformados com Recharts para exibição em gráficos

### Fluxo de Autenticação

1. `index.tsx` renderiza `AuthProvider` como wrapper global
2. `AuthProvider` (`contexts/AuthContext.tsx:118-130`) usa `onAuthStateChanged` para observar estado do Firebase Auth
3. Ao detectar usuário autenticado, busca perfil no Firestore (`getUsers()`) e sincroniza (`ensureUserDocumentByAuthUID`)
4. `PrivateRoute.tsx` consome `useAuth()` — se `loading`, mostra spinner; se sem `currentUser`, renderiza `<Login />`
5. `Login.tsx` chama `login()` do contexto que usa `signInWithEmailAndPassword` do Firebase Auth

### Fluxo de Formulário Público MN10

1. Rota pública `/mn10/f/:publicId` definida em `index.tsx:22` renderiza `MN10PublicFormPage` **sem** `PrivateRoute`
2. `MN10PublicFormPage` (`components/mn10/public/MN10PublicFormPage.tsx`) usa `useParams()` para obter `publicId`
3. Busca formulário publicado via `getMn10FormByPublicId()` (`mn10Service.ts:543`) que consulta Firestore com `where('publicId', '==', publicId)` e `where('status', '==', 'published')`
4. Submissão chama `submitMn10Response()` (`mn10Service.ts:612`) que:
   - Valida respostas obrigatórias e formatos
   - Faz upload de arquivos para Firebase Storage (`mn10/uploads/{formId}/{responseId}/...`)
   - Cria documento em `mn10Forms/{formId}/responses/{responseId}`
   - Atualiza contador `responseCount` no formulário via transação Firestore
5. `MN10Dashboard` (acessível apenas autenticado) permite visualizar respostas e preencher campos internos via `updateMn10InternalAnswers()` (`mn10Service.ts:577`)

**Gerenciamento de Estado:**
- Estado global: Apenas autenticação via React Context (`AuthContext`)
- Estado local: Cada componente de feature gerencia seu próprio estado com `useState`/`useEffect`
- Comunicação entre componentes: Via props ou recarregando dados do Firestore
- Cache/offline: Não implementado

## Abstrações Principais

**Contexto de Autenticação (`AuthContext`):**
- Objetivo: Fornecer estado de autenticação e helpers de permissão para toda a árvore de componentes
- Exemplos: `contexts/AuthContext.tsx`
- Padrão: React Context API + hook customizado `useAuth()`
- Expõe: `currentUser` (FirebaseUser), `systemUser` (perfil Firestore), `login`, `logout`, `loading`, `error`, `isAdmin`, `isManager`, `canAccessBranch(branch)`, `canManageSystem`, `canAccessMN10`

**Serviços Firebase (`firebaseService.ts`, `mn10Service.ts`):**
- Objetivo: Encapsular operações CRUD do Firestore e Storage como funções assíncronas tipadas
- Exemplos: `saveEvaluation()`, `getEvaluations()`, `createMn10Form()`, `submitMn10Response()`
- Padrão: Módulo de funções exportadas, sem classes; cada função retorna Promise com tipos definidos em `types.ts`
- Tratamento de erro: try/catch com mensagens em português, console.error para debugging

**Sistema de Templates Customizáveis:**
- Objetivo: Permitir criação de formulários de avaliação com campos dinâmicos (rating, texto, data, radio, checkbox)
- Tipos de campo: `rating` (0-10), `rating-5` (1-5), `text`, `radio`, `date`, `checkbox` — definidos em `types.ts:3`
- Cada `EvaluationTemplate` possui `criteriaConfig: EvaluationCriterion[]` com metadados de cada campo
- Componentes `DynamicField.tsx`, `RatingSlider.tsx`, `RatingSlider5.tsx` renderizam campos dinamicamente

**Sistema de Visibilidade MN10:**
- Objetivo: Campos de formulário podem ser `public` (visíveis ao respondente anônimo) ou `internal` (preenchidos apenas pela equipe autenticada)
- Implementado via campo `visibility` em `MN10Question` (`types.ts:86`)
- `isInternalQuestion()` usado em `mn10Service.ts:136-138` para filtrar campos durante validação e submissão pública

## Pontos de Entrada

**Entrada da Aplicação:**
- Localização: `index.html` → `index.tsx`
- Gatilhos: Carregamento da página no navegador
- Responsabilidades: Montar árvore React, configurar BrowserRouter, AuthProvider, definir rotas

**Rota Pública MN10:**
- Localização: `/mn10/f/:publicId` definido em `index.tsx:22`
- Gatilhos: Acesso direto via link público
- Responsabilidades: Renderizar formulário público sem autenticação

**Rota Protegida (App):**
- Localização: `/*` definido em `index.tsx:24-29`
- Gatilhos: Qualquer rota que não seja `/mn10/f/:publicId`
- Responsabilidades: Verificar autenticação via `PrivateRoute`, renderizar `App.tsx`

**Build para Produção:**
- Localização: `vite.config.ts` → saída em `dist/`
- Gatilhos: `npm run build` ou CI (push na `main`)
- Responsabilidades: Compilar TypeScript, agrupar com Vite, base path configurado para `/Acompanhamento-de-motoristas/`

## Restrições Arquiteturais

- **Threading:** Single-threaded (JavaScript event loop no navegador). Operações assíncronas via Promises/async-await.
- **Estado global:** Apenas `AuthContext` mantém estado compartilhado (`contexts/AuthContext.tsx`). Demais estados são locais aos componentes.
- **Importações circulares:** Não detectadas.
- **TypeScript estrito:** `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true` (`tsconfig.json:18-21`).
- **Imports com extensão:** `allowImportingTsExtensions: true` e `noEmit: true` — imports devem incluir extensão `.ts`/`.tsx` (`tsconfig.json:28-29`).
- **Build output:** Vite com `noEmit: true` — TypeScript apenas verifica tipos, Vite faz o bundling.
- **Firestore long polling:** Configurado em `firebase.ts:24-27` — `experimentalForceLongPolling: true` para compatibilidade.

## Anti-Padrões

### Serviço Mock Legado (evaluationService.ts)

**O que acontece:** `services/evaluationService.ts` implementa CRUD com dados em memória (array `mockEvaluations`, `mockTemplates`). O componente `Dashboard.tsx` ainda importa deste serviço.
**Por que é errado:** Duas fontes de verdade para operações de avaliação (mock vs Firestore). Mudanças em um não refletem no outro. `Dashboard.tsx` usa dados mock que nunca terão dados reais.
**Faça isso:** Use `services/firebaseService.ts` para todas as operações de avaliação. Remova ou descontinue `Dashboard.tsx` e `evaluationService.ts`.

### Duplicação de Validação MN10

**O que acontece:** Lógica de validação de respostas MN10 existe duplicada em `mn10Service.ts` (funções `validateRequiredAnswers`, `validateAnswerFormats`) e em `MN10PublicFormPage.tsx` (funções locais `validateRequired`, `validateAnswerFormats`).
**Por que é errado:** Mudanças nas regras de validação precisam ser feitas em dois lugares. Risco de divergência.
**Faça isso:** Consolidar validação no `mn10Service.ts` e exportar as funções para reuso no componente público.

### Renderização Condicional por Switch no App.tsx

**O que acontece:** `App.tsx:29-43` usa `switch/case` para selecionar qual componente renderizar baseado em `activeTab`.
**Por que é errado:** Adicionar nova aba requer modificar o switch, o tipo `Tab`, e os botões de navegação. Não escala bem.
**Faça isso:** Considerar um mapeamento declarativo (objeto ou array de config) ou usar React Router com rotas aninhadas para as abas.

### Três Arquivos Placeholder Vazios

**O que acontece:** `components/UserMigration.tsx`, `scripts/createAdminUser.js`, `scripts/migrateUsers.js` são arquivos esvaziados que existem apenas como placeholders.
**Por que é errado:** Poluem o código, podem confundir novos desenvolvedores.
**Faça isso:** Remover ou implementar a funcionalidade pendente.

## Tratamento de Erros

**Estratégia:** Try/catch em funções de serviço com mensagens de erro em português. Componentes capturam erros e exibem em estado local (`error`).

**Padrões:**
- Serviços Firebase: `try { ... } catch (error) { console.error(...); throw new Error('Mensagem em PT-BR'); }`
- Autenticação: Switch no código de erro Firebase Auth para mensagens amigáveis (`AuthContext.tsx:87-103`)
- Componentes: Estado `error` exibido como banner condicional (`{error && <div className="...bg-red-50...">{error}</div>}`)
- Erros esperados (formulário não encontrado, permissão negada) são lançados como `Error` com mensagem específica

## Preocupações Transversais

**Logging:** `console.error` e `console.warn` para debugging. Sem serviço de logging estruturado.
**Validação:** Validacão no client-side antes da submissão. Regras de segurança do Firestore (`firestore.rules`) como camada adicional no servidor.
**Autenticação:** Firebase Auth com email/senha. Sem provedores sociais. Perfil de usuário e permissões no Firestore (`users` collection).

---

*Análise de arquitetura: 2026-06-01*
