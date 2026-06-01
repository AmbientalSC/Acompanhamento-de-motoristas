---
last_mapped_commit: 9aadfa0dd0f09fb5d364ab388fbc6853608b3665
mapped_at: 2026-06-01
focus: tech
---

# Integrações Externas

**Data da Análise:** 2026-06-01

## Firebase (Backend Principal)

**Projeto:** `motoristas-f4aed`
**SDK:** Firebase Web SDK v12.0.0 (cliente)
**Configuração:** `firebase.ts`

> Nota: As credenciais da API do Firebase são expostas no client-side por design do SDK Firebase. Isto é normal e esperado para aplicações Firebase client-side.

### Firebase Authentication

**Provedor:** Email/Senha (nativo Firebase Auth)
**Implementação:**
- Login: `signInWithEmailAndPassword` em `contexts/AuthContext.tsx:82`
- Logout: `signOut` em `contexts/AuthContext.tsx:112`
- Observer: `onAuthStateChanged` em `contexts/AuthContext.tsx:119`
- Criação de usuários: `createUserWithEmailAndPassword` em `services/firebaseService.ts:272`
- Roles: `admin` (acesso total) e `manager` (acesso por filial)
- Permissões adicionais: `canAccessMN10` (acesso ao módulo MN10)

**Fluxo de autenticação:**
1. `AuthProvider` (`contexts/AuthContext.tsx`) envolve toda a aplicação
2. `onAuthStateChanged` monitora o estado de autenticação
3. Ao autenticar, busca perfil do usuário no Firestore (`getUsers()`)
4. `PrivateRoute` (`components/PrivateRoute.tsx`) protege rotas que exigem login

### Firestore (Banco de Dados)

**Tipo:** NoSQL orientado a documentos
**Cliente:** Firebase Firestore SDK (Web v9 modular)
**Inicialização:** `initializeFirestore` com `experimentalForceLongPolling: true` em `firebase.ts:24-27`

**Coleções:**

| Coleção | Caminho | Descrição | Serviço |
|----------|---------|-----------|---------|
| `templates` | `/templates/{docId}` | Modelos de formulários de avaliação | `services/firebaseService.ts:21-116` |
| `evaluations` | `/evaluations/{docId}` | Avaliações de motoristas | `services/firebaseService.ts:119-184` |
| `branches` | `/branches/{docId}` | Filiais da empresa | `services/firebaseService.ts:187-228` |
| `users` | `/users/{docId}` | Perfis de usuários do sistema | `services/firebaseService.ts:231-402` |
| `mn10Forms` | `/mn10Forms/{formId}` | Formulários MN10 | `services/mn10Service.ts:428-541` |
| `mn10Responses` | `/mn10Forms/{formId}/responses/{responseId}` | Respostas aos formulários MN10 (subcoleção) | `services/mn10Service.ts:558-777` |

**Regras de Segurança:** `firestore.rules`
- Formulários MN10 publicados têm leitura pública
- Criação de respostas MN10 permitida sem autenticação (com validação de payload)
- Demais coleções exigem autenticação (`isSignedIn()`)
- Fallback: qualquer documento não listado tem acesso negado

### Firebase Storage

**Uso:** Upload de anexos em respostas de formulários MN10
**Bucket:** `motoristas-f4aed.firebasestorage.app`
**Path de upload:** `mn10/uploads/{formId}/{responseId}/{questionId}/{fileName}`
**Cliente:** `firebase/storage` em `firebase.ts:28`
**Serviço:** `services/mn10Service.ts:677` (upload), `services/mn10Service.ts:754` (delete), `services/mn10Service.ts:812` (download URL)

**Tipos permitidos:** Imagens (`image/*`) e PDF (`application/pdf`)
**Tamanho máximo:** 10 MB por arquivo (padrão, definido em `services/mn10Service.ts:33`)
**Máximo de arquivos:** 1 por questão (padrão, definido em `services/mn10Service.ts:34`)

**Regras de Segurança:** `storage.rules`
- Criação de arquivos permitida sem autenticação (para formulários publicados)
- Leitura e exclusão exigem autenticação com permissão MN10
- Atualização de arquivos: negada

### Firebase Analytics

**Uso:** Monitoramento de uso da aplicação
**Inicialização:** `firebase.ts:22`
**ID de medição:** Configurado em `firebaseConfig.measurementId`
- Não há chamadas explícitas a eventos de analytics no código-fonte (apenas inicialização)

## CDNs Externas

### ESM.sh (Import Map)

**Uso:** Resolução de módulos ES no navegador para produção
**Configuração:** `<script type="importmap">` em `index.html:9-19`

Pacotes carregados via CDN:
```json
{
  "react": "https://esm.sh/react@^19.1.0",
  "react-dom/": "https://esm.sh/react-dom@^19.1.0/",
  "react/": "https://esm.sh/react@^19.1.0/",
  "lucide-react": "https://esm.sh/lucide-react@^0.528.0",
  "recharts": "https://esm.sh/recharts@^3.1.0"
}
```

> Nota: O import map é usado apenas em produção (GitHub Pages). No desenvolvimento local, o Vite resolve os módulos via `node_modules`.

### Google Fonts

**Uso:** Fonte Inter para toda a aplicação
**URL:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap`
**Importação:** `index.css:1`

## Gemini API (Configurada, Não Utilizada)

**Configuração:** `vite.config.ts:9-10`
- A chave `GEMINI_API_KEY` é injetada no bundle como `process.env.API_KEY` e `process.env.GEMINI_API_KEY`
- A chave é lida do ambiente (arquivo `.env`) durante o build

**Status:** A chave está configurada no Vite, mas **não há código no projeto que consuma a API do Gemini**. Não há imports do SDK `@google/generative-ai` nem chamadas HTTP à API. Trata-se de uma integração planejada ou descontinuada.

## GitHub Pages (Hospedagem)

**Plataforma:** GitHub Pages
**Branch de deploy:** `gh-pages`
**URL base:** `/Acompanhamento-de-motoristas/`
**SPA Redirect:** Script inline em `index.html:20-41` + arquivo `404.html` (padrão GitHub Pages SPA)

## GitHub Actions (CI/CD)

**Workflows:**
1. `.github/workflows/deploy.yml` — Deploy oficial via `actions/deploy-pages@v4`
2. `.github/workflows/deploy-gh-pages.yml` — Deploy alternativo via `peaceiris/actions-gh-pages@v3`

**Triggers:** Push na branch `main`
**Runner:** ubuntu-latest
**Node.js:** 18
**Permissões:** `contents: read`, `pages: write`, `id-token: write`

## Variáveis de Ambiente

**Arquivo `.env`:** Gitignored (`.gitignore:12-16`), não presente no repositório

**Variáveis utilizadas (esperadas no `.env`):**
- `GEMINI_API_KEY` — Chave de API do Google Gemini (injetada via `vite.config.ts`, mas não consumida em runtime)

**Configuração do Firebase:** Hardcoded em `firebase.ts:10-18` (por design do Firebase client SDK — as credenciais são públicas para aplicações web)

## Serviços e APIs por Funcionalidade

### Formulários de Avaliação (Interno)
- **Leitura/Escrita:** Firestore (`templates`, `evaluations`, `branches`, `users`)
- **Autenticação:** Firebase Auth (email/senha)
- **Geração de PDF:** jsPDF + html2canvas (client-side, sem API externa)
  - `services/pdfService.ts` — PDF de avaliações

### Formulários MN10 (Público + Interno)
- **Leitura pública:** Firestore (`mn10Forms` com status `published`)
- **Submissão anônima:** Firestore (`mn10Forms/{id}/responses`) — sem autenticação
- **Upload de anexos:** Firebase Storage (`mn10/uploads/...`) — sem autenticação
- **Preenchimento interno:** Firestore (`internalAnswers`) — requer autenticação
- **Geração de PDF:** jsPDF (client-side)
  - `services/mn10PdfService.ts` — PDF de respostas MN10

### Dashboards e Gráficos
- **Dados:** Firestore (consultas agregadas de `evaluations`)
- **Renderização:** Recharts (client-side, sem API externa)

## Resumo de Integrações

| Integração | Tipo | Autenticação | Escopo |
|------------|------|-------------|--------|
| Firebase Auth | Autenticação | Email/senha | Todos os usuários internos |
| Firestore | Banco de dados NoSQL | Regras de segurança | Dados da aplicação |
| Firebase Storage | Armazenamento de arquivos | Regras de segurança | Anexos MN10 |
| Firebase Analytics | Analytics | SDK automático | Uso da aplicação |
| Google Fonts | CDN de fontes | Nenhuma | Fonte Inter |
| ESM.sh | CDN de módulos | Nenhuma | Dependências em produção |
| Gemini API | API de IA | API Key (configurada) | **Não utilizado no código** |
| GitHub Pages | Hospedagem | GitHub Actions | Deploy automático |

---

*Auditoria de integrações: 2026-06-01*
