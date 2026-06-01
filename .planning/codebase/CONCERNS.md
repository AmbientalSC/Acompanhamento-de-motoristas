---
last_mapped_commit: 9aadfa0dd0f09fb5d364ab388fbc6853608b3665
analysis_date: 2026-06-01
---

# Preocupações do Codebase

**Data da Análise:** 2026-06-01

## Dívida Técnica

### Serviço Legado de Mock Ainda Presente

**Problema:** O arquivo `services/evaluationService.ts` (143 linhas) é um serviço de mock completo com dados hardcoded, que foi substituído pelo `services/firebaseService.ts`. Nenhum componente importa este serviço, mas ele ainda existe no codebase, contendo lógica de negócio duplicada (IDs de template, scores iniciais, dados de exemplo) que pode causar confusão.

**Arquivos:**
- `services/evaluationService.ts` — serviço mock legado (não utilizado)
- `services/firebaseService.ts` — serviço real em produção

**Impacto:** Risco de um desenvolvedor importar o serviço errado. Manutenção de código morto. Duplicação de constantes (`DEFAULT_TEMPLATE_ID`).

**Abordagem de Correção:** Remover `services/evaluationService.ts` e sua constante `DEFAULT_TEMPLATE_ID` de `constants.ts`. Verificar se `EVALUATION_CRITERIA` ainda é usada em algum lugar funcional.

---

### Três Arquivos Placeholder Vazios

**Problema:** Três arquivos estão vazios e declarados como placeholders:
- `components/UserMigration.tsx` — 0 linhas
- `scripts/createAdminUser.js` — 0 linhas  
- `scripts/migrateUsers.js` — 0 linhas

**Impacto:** Poluição do codebase. Se alguém tentar executar `node scripts/createAdminUser.js`, receberá silenciosamente nenhum resultado.

**Abordagem de Correção:** Remover os arquivos vazios e criar issues para implementar a funcionalidade faltante quando necessário.

---

### Workflows de CI/CD Duplicados

**Problema:** Existem dois workflows de deploy com propósitos sobrepostos:
- `.github/workflows/deploy.yml` — Deploy via `actions/deploy-pages@v4` (GitHub Pages nativo)
- `.github/workflows/deploy-gh-pages.yml` — Deploy via `peaceiris/actions-gh-pages@v3` (branch `gh-pages`)

Ambos disparam em push na `main`. O `deploy.yml` remove `node_modules` e reinstala com `--legacy-peer-deps --prefer-offline --no-audit --no-fund`, mas isso remove o lockfile existente e gera um novo. O `deploy-gh-pages.yml` usa `npm ci` (que respeita o lockfile). Os dois sobrescrevem o mesmo destino (`gh-pages`).

**Arquivos:**
- `.github/workflows/deploy.yml`
- `.github/workflows/deploy-gh-pages.yml`

**Impacto:** Condição de corrida no deploy — os dois workflows disparam simultaneamente no push para `main`, podendo causar falhas intermitentes ou conflitos de deploy.

**Abordagem de Correção:** Escolher um workflow e remover o outro. Recomenda-se manter o `deploy.yml` (GitHub Pages nativo) e excluir `deploy-gh-pages.yml`.

---

### Uso Excessivo de `any` no TypeScript

**Problema:** O tipo `any` é usado em 14 locais do codebase, minando a segurança de tipos do TypeScript estrito (`strict: true`). Padrões recorrentes:

**Arquivos e exemplos:**
- `types.ts:65` — `fieldValues?: Record<string, any>` na interface `Evaluation`
- `components/EvaluationForm.tsx:40` — `useState<Record<string, any>>({})` para fieldValues
- `components/EvaluationForm.tsx:179` — `const evaluationToSave: any = { ... }` ao salvar
- `components/ui/DynamicField.tsx:12-13` — `value: any; onChange: (value: any) => void`
- `services/firebaseService.ts:57,90` — `(dataToSave as any).criteriaConfig`
- `components/FormsViewer.tsx:287` — `let orderedEntries: [string, any][] = []`
- `components/GeneralDashboard.tsx:178` — `data: any[]`

**Impacto:** Perda de verificação de tipo em tempo de compilação. Erros de runtime em campos dinâmicos não são capturados pelo TypeScript.

**Abordagem de Correção:** Substituir `any` por tipos específicos. Para `fieldValues`, usar um tipo union discriminado baseado no `FieldType`. Para o `DynamicField`, usar genéricos ou tipos mais restritos como `string | number | boolean`.

---

### API Deprecada `onKeyPress` no React 19

**Problema:** O evento `onKeyPress` está deprecado desde React 17 e foi completamente removido em versões futuras. O React 19 emite warnings sobre este uso.

**Arquivos:**
- `components/TemplateManager.tsx:810` — `onKeyPress={(e) => e.key === 'Enter' && handleAddBranch()}`
- `components/TemplateManager.tsx:841` — `onKeyPress={(e) => e.key === 'Enter' && handleSaveBranchEdit()}`

**Impacto:** Warnings de console. Pode quebrar em versões futuras do React. Funcionalidade de submeter formulários com Enter não funcionará quando for removido.

**Abordagem de Correção:** Substituir `onKeyPress` por `onKeyDown` com a mesma lógica: `onKeyDown={(e) => e.key === 'Enter' && handleAddBranch()}`.

---

### Logs de Dados Sensíveis no Console

**Problema:** `services/firebaseService.ts` contém `console.log` que expõe dados potencialmente sensíveis em produção, incluindo emails de usuários e conteúdo completo de avaliações.

**Arquivos e exemplos:**
- `services/firebaseService.ts:121` — `console.log('Tentando salvar avaliação:', evaluationData)` — expõe todos os dados da avaliação
- `services/firebaseService.ts:129` — `console.log('Dados que serão salvos:', dataToSave)` — expõe dados completos incluindo Timestamp
- `services/firebaseService.ts:329` — `console.log('Senha será atualizada para o usuário:', userData.email)` — expõe email do usuário
- `services/evaluationService.ts` — múltiplos `console.log` com dados mock

**Impacto:** Vazamento de dados em console do navegador. Em produção, qualquer pessoa com acesso ao DevTools pode ver avaliações completas e emails de usuários.

**Abordagem de Correção:** Remover `console.log` de dados sensíveis ou envolvê-los em condicionais de ambiente (`if (import.meta.env.DEV)`). Substituir por logs estruturados que não exponham dados completos.

---

## Bugs Conhecidos

### Edição de Filial Não Persiste no Firestore

**Sintomas:** Ao editar uma filial na aba "Filiais" do TemplateManager, a alteração é aplicada apenas no estado local (`setBranches`), mas nunca é salva no Firestore. Ao recarregar a página, a filial volta ao nome original.

**Arquivos:**
- `components/TemplateManager.tsx:324-329` — função `handleSaveBranchEdit`

**Gatilho:** Editar qualquer filial existente, alterar o nome e clicar em "Salvar".

**Workaround:** Nenhum workaround direto. É necessário excluir a filial e recriá-la com o nome novo, ou editar diretamente no console do Firebase.

---

### Senha de Usuário Não é Atualizada

**Sintomas:** O campo de "Nova Senha" aparece na edição de usuário, mas ao submeter, a senha nunca é realmente alterada. O código contém um `TODO` explícito sobre isso.

**Arquivos:**
- `services/firebaseService.ts:326-331` — bloco `if (userData.password)` com `console.log` e `TODO`

**Gatilho:** Editar um usuário existente, preencher o campo "Nova Senha" e salvar.

**Workaround:** É necessário criar um novo usuário com a senha desejada e excluir o antigo. Para admins, usar o Firebase Console diretamente.

---

### Modelos de Exemplo Podem Ser Importados Múltiplas Vezes

**Sintomas:** O botão "Importar Modelos de Exemplo" no `TemplateManager` não verifica se o modelo já foi importado anteriormente. Cada clique cria novos modelos duplicados.

**Arquivos:**
- `components/TemplateManager.tsx:285-303` — função `importExampleTemplates`
- `data/exampleTemplates.ts` — definições dos modelos

**Gatilho:** Clicar em "Importar Modelos de Exemplo" mais de uma vez.

**Workaround:** Excluir manualmente os modelos duplicados.

---

### Conflito de IDs em `criteriaConfig` na Criação de Critérios

**Sintomas:** Ao criar múltiplos critérios rapidamente no `TemplateManager`, a função `generateId()` pode gerar o mesmo ID se chamada no mesmo milissegundo (usa `Date.now()` + random). Como o mapeamento em `EvaluationForm` usa o ID como chave, campos podem se sobrescrever silenciosamente.

**Arquivos:**
- `components/TemplateManager.tsx:97-99` — função `generateId()`

**Gatilho:** Criar dois critérios em rápida sucessão (sub-milissegundo) ou em ambiente onde `Math.random()` é previsível.

**Workaround:** Adicionar um pequeno delay entre adições de critérios.

---

## Considerações de Segurança

### API Key do Google Gemini Exposta no Build

**Risco:** A chave `GEMINI_API_KEY` é injetada no bundle JavaScript via `define` no Vite config, expondo-a publicamente no código fonte do frontend.

**Arquivos:**
- `vite.config.ts:9-10` — `'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY)`
- `vite.config.ts:10` — `'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)`

**Mitigação Atual:** Nenhuma. A chave fica visível no bundle final.

**Recomendações:** 
1. Remover a injeção da chave no frontend
2. Se o Gemini for necessário, criar uma Cloud Function no Firebase que atue como proxy
3. Adicionar `GEMINI_API_KEY` ao `.gitignore` se existir `.env` local

---

### Regras do Firestore Permissivas para Coleções Sensíveis

**Risco:** As regras atuais permitem que QUALQUER usuário autenticado (`isSignedIn()`) leia e escreva em coleções sensíveis:
- `templates` — qualquer usuário pode modificar modelos
- `evaluations` — qualquer usuário pode ver todas as avaliações
- `branches` — qualquer usuário pode modificar filiais
- `users` — qualquer usuário pode ler dados de todos os outros usuários (emails, cargos, filiais)

**Arquivos:**
- `firestore.rules:105-119` — regras `allow read, write: if isSignedIn()` para todas as coleções

**Mitigação Atual:** A interface `TemplateManager` esconde abas com base no `role`, mas isso é apenas segurança client-side. Um usuário com acesso ao console Firebase ou SDK poderia burlar essa restrição.

**Recomendações:**
1. Restringir `write` para `users` apenas para admins
2. Adicionar verificação de `role` nas regras do Firestore (não apenas no frontend)
3. Para `evaluations`, considerar filtro por filial para managers

---

### Exclusão de Usuário Não Remove Conta do Firebase Auth

**Risco:** `deleteUser()` em `firebaseService.ts` remove apenas o documento do Firestore, mas não a conta correspondente no Firebase Authentication. Isso deixa órfãos no Auth que podem ainda fazer login (embora sem perfil no Firestore).

**Arquivos:**
- `services/firebaseService.ts:395-402` — função `deleteUser`

**Mitigação Atual:** `AuthContext.loadSystemUser()` verifica `isActive` e retorna `null` se o usuário não for encontrado ou estiver inativo, efetivamente bloqueando o acesso.

**Recomendações:** Adicionar chamada para deletar o usuário no Firebase Auth (requer Cloud Function ou Admin SDK, pois o client SDK não permite deletar outros usuários).

---

### Ausência de Rate Limiting em Submissões MN10

**Risco:** O endpoint público de submissão MN10 (`submitMn10Response`) não tem proteção contra envios em massa. Um atacante pode submeter milhares de respostas via script.

**Arquivos:**
- `services/mn10Service.ts:612-742` — função `submitMn10Response`
- `firestore.rules:96-98` — regra `allow create` para respostas

**Mitigação Atual:** Existe um campo `honeypot` que bloqueia submissões se preenchido (anti-bot básico). O `validResponsePayload` no Firestore limita `answers.size() <= 200` e `attachments.size() <= 20`.

**Recomendações:**
1. Adicionar App Check do Firebase para proteger contra abuso
2. Implementar rate limiting via Cloud Functions
3. Considerar CAPTCHA para formulários públicos

---

## Gargalos de Performance

### Carregamento Completo da Coleção `users` no Login

**Problema:** Toda vez que o estado de autenticação muda (`onAuthStateChanged`), o `AuthContext` carrega TODOS os usuários do Firestore para encontrar o perfil do usuário logado. Em uma organização com muitos usuários, isso é desnecessariamente custoso.

**Arquivos:**
- `contexts/AuthContext.tsx:58-77` — função `loadSystemUser` que chama `getUsers()` e então faz `find()`
- `services/firebaseService.ts:231-267` — `getUsers()` sem filtro

**Causa:** Não há uma query direta por `authUID` ou `email`. O código carrega todos os documentos e filtra em memória.

**Caminho de Melhoria:** Substituir por uma query com `where('authUID', '==', firebaseUser.uid)` no Firestore, que retorna apenas 1 documento.

---

### Sem Paginação nas Coleções

**Problema:** Todas as funções de leitura (`getEvaluations`, `getTemplates`, `getUsers`, `listMn10Forms`, `listMn10Responses`) carregam a coleção inteira sem `limit` ou cursores de paginação.

**Arquivos:**
- `services/firebaseService.ts:140-175` — `getEvaluations()` sem paginação
- `services/mn10Service.ts:428-432` — `listMn10Forms()` sem paginação
- `services/mn10Service.ts:558-563` — `listMn10Responses()` sem paginação

**Causa:** Ausência de parâmetros de paginação e cursores. Todas as queries usam apenas `orderBy`.

**Caminho de Melhoria:** Implementar paginação com `limit` e cursores (`startAfter`) no Firestore. Para dados que raramente excedem 100 documentos, paginação pode não ser crítica, mas é uma boa prática.

---

### PDFService Recarrega Logo a Cada Geração

**Problema:** A logo (`ambiental.svg`) é recarregada via `Image()` a cada geração de PDF, sem cache. Em múltiplas gerações consecutivas, isso causa requisições de rede redundantes.

**Arquivos:**
- `services/pdfService.ts:7-35` — método `loadLogo()`

**Causa:** A função `loadLogo()` é chamada em cada `generateEvaluationPDF()` e `generateDriverAnalysisPDF()` sem memoização.

**Caminho de Melhoria:** Cachear a logo como `dataURL` em uma variável estática da classe após o primeiro carregamento.

---

### Mega-Componente TemplateManager (1200+ linhas)

**Problema:** `TemplateManager.tsx` gerencia três domínios distintos (modelos, filiais, usuários) em um único componente de 1200+ linhas. Cada aba tem sua própria lógica de CRUD, validação e estado, mas tudo reside no mesmo componente.

**Arquivos:**
- `components/TemplateManager.tsx` — 1200+ linhas, 3 domínios

**Causa:** O componente foi crescendo organicamente com a adição de abas (`models`, `branches`, `users`, `forms`) sem refatoração.

**Caminho de Melhoria:** Extrair cada aba em seu próprio componente:
- `components/admin/ModelManager.tsx`
- `components/admin/BranchManager.tsx` 
- `components/admin/UserManager.tsx`
- `components/admin/FormsTab.tsx`

---

## Áreas Frágeis

### Serviço Firebase Monolítico

**Arquivos:** `services/firebaseService.ts` (402 linhas)

**Por que é frágil:** O arquivo `firebaseService.ts` agrupa todas as operações Firestore (templates, evaluations, branches, users) em um único módulo. Qualquer alteração em uma entidade requer modificar este arquivo, aumentando o risco de conflitos de merge e regressões.

**Modificação Segura:** Extrair operações de cada entidade para arquivos separados:
- `services/templateService.ts`
- `services/evaluationService.ts` (novo, substituindo o mock)
- `services/branchService.ts`
- `services/userService.ts`

**Cobertura de Testes:** Nenhum teste para as operações Firestore. Toda alteração precisa ser testada manualmente.

---

### Caminhos de Compatibilidade Legada Espalhados

**Arquivos:**
- `components/EvaluationForm.tsx` — blocos `if (template.criteriaConfig) { ... } else { ... }` (linhas 86-114, 140-148, 374-408)
- `components/TemplateManager.tsx` — conversão de `criteria` para `criteriaConfig` (linhas 183-208)
- `services/pdfService.ts` — lógica de mapeamento com fallback (linhas 158-220)
- `services/firebaseService.ts` — `data.criteria || []` para compatibilidade (linhas 31, 49)

**Por que é frágil:** O sistema suporta dois formatos de dados (antigo `criteria: string[]` e novo `criteriaConfig: EvaluationCriterion[]`). A lógica de compatibilidade está duplicada em múltiplos componentes. Se um novo campo for adicionado ao `criteriaConfig`, é necessário atualizar todos os locais de compatibilidade.

**Modificação Segura:** Criar uma migration que converta todos os documentos antigos no Firestore para o novo formato. Remover o suporte ao formato antigo após a migração.

**Cobertura de Testes:** Nenhum teste para verificar que ambos os formatos funcionam corretamente.

---

### Lógica de `isPureRating5` Duplicada

**Problema:** A detecção de templates que usam exclusivamente escala 1-5 (`isPureRating5`) está duplicada entre `EvaluationForm.tsx` (linhas 240-246) e `getEvaluationStatus` em `evaluationUtils.ts` (parâmetro `scale`). A lógica de thresholds é mantida em dois lugares diferentes.

**Arquivos:**
- `components/EvaluationForm.tsx:240-246`
- `utils/evaluationUtils.ts:17-35`
- `components/EvaluationForm.tsx:259-278` — thresholds inline
- `components/DriverDashboard.tsx:222-235` — thresholds via `getEvaluationStatus`

**Por que é frágil:** Se os thresholds mudarem (ex: aprovação de 7 para 8), é necessário atualizar em `EvaluationForm.tsx` (renderização inline) E em `evaluationUtils.ts`.

---

### Mn10Service - Arquivo Mais Longo do Projeto

**Arquivos:** `services/mn10Service.ts` (815 linhas)

**Por que é frágil:** Este arquivo contém TODA a lógica do MN10: validação de formulários, normalização de dados, upload de arquivos, CRUD de respostas, transações Firestore, e mensagens de erro. É o segundo maior arquivo do projeto e o mais complexo.

**Modificação Segura:** Separar em:
- `services/mn10/mn10FormService.ts` — CRUD de formulários
- `services/mn10/mn10ResponseService.ts` — submissão e gestão de respostas
- `services/mn10/mn10Validation.ts` — funções de validação e normalização
- `services/mn10/mn10UploadService.ts` — lógica de upload para Storage

**Cobertura de Testes:** Nenhum. A lógica de validação (datas, telefones, arquivos) é complexa e propensa a erros sem testes.

---

## Limites de Escala

### Coleção `evaluations` Sem Índices Compostos

**Capacidade Atual:** A query `getEvaluations()` usa apenas `orderBy('timestamp', 'desc')`. Para cenários com milhares de avaliações, buscas filtradas por motorista, filial ou data exigiriam índices compostos no Firestore.

**Limite:** Atualmente sem índices compostos definidos. Firestore cria automaticamente índices single-field, mas consultas com múltiplos `where` + `orderBy` exigem índices compostos manuais.

**Caminho de Escala:** Criar índices compostos para queries comuns como `filial + timestamp`, `motorista + timestamp`, `templateId + timestamp`.

---

### Submissões MN10 Sem Fila

**Capacidade Atual:** O `submitMn10Response` processa uploads de arquivos sequencialmente dentro da transação. Com múltiplos uploads grandes e latência de rede, a submissão pode exceder o timeout do Firestore (60 segundos para transações).

**Arquivos:** `services/mn10Service.ts:643-694`

**Limite:** 5 uploads de 10MB cada = 50MB + overhead da transação. A transação Firestore também tem limite de 5 tentativas de retry.

**Caminho de Escala:** Mover uploads para fora da transação (processar uploads primeiro, depois criar o documento em transação). Considerar Cloud Functions para processar uploads de forma assíncrona.

---

## Dependências em Risco

### React 19 com `--legacy-peer-deps`

**Risco:** O projeto depende de `npm install --legacy-peer-deps` porque algumas dependências não declaram compatibilidade com React 19. Isso mascara potenciais problemas de compatibilidade.

**Arquivos:** 
- `package.json` — React 19.1.0
- `.github/workflows/deploy.yml:33` — `npm install --legacy-peer-deps`

**Impacto:** Bibliotecas como `lucide-react`, `recharts` ou `react-router-dom` podem ter comportamentos inesperados com React 19 se não foram atualizadas/testadas para esta versão.

**Plano de Migração:** Verificar cada dependência quanto à compatibilidade com React 19. Atualizar para versões que declarem suporte explícito. Remover `--legacy-peer-deps` quando todas estiverem compatíveis.

---

### jsPDF e html2canvas

**Risco:** `html2canvas` (v1.4.1) é usado apenas para geração de PDF, mas é uma dependência pesada (~500KB) que pode ter vulnerabilidades de XSS via conteúdo HTML renderizado.

**Arquivos:** `package.json:14` — `html2canvas: ^1.4.1`

**Impacto:** Se usado para renderizar HTML não confiável no PDF, pode haver risco de XSS.

**Plano de Migração:** Verificar se `html2canvas` está sendo efetivamente utilizado (pode ter sido incluído para uso futuro). Se não estiver em uso, remover a dependência.

---

## Funcionalidades Críticas Ausentes

### Ausência Total de Testes

**Problema:** Não há framework de teste configurado. Nenhum arquivo de teste (`*.test.ts`, `*.spec.ts`, `*.test.tsx`) existe no projeto.

**Bloqueia:** Refatorações seguras, garantia de regressão, confiança em deploys.

---

### Sem Validação de Email Real

**Problema:** O sistema não verifica se o email do usuário realmente existe (sem verificação de email no Firebase Auth).

**Arquivos:** `services/firebaseService.ts:269-308` — `saveUser()`, `contexts/AuthContext.tsx:79-107` — `login()`

**Bloqueia:** Usuários podem ser criados com emails inexistentes. Recuperação de senha não funcionará para esses usuários.

---

### Sem Tratamento de Erro Global

**Problema:** Não há `ErrorBoundary` React implementado. Erros não capturados em componentes causam crash da aplicação inteira (tela branca).

**Arquivos:** Nenhum `ErrorBoundary` encontrado no codebase.

**Bloqueia:** Experiência do usuário em caso de falhas. Um erro em um componente pode derrubar toda a SPA.

---

### Sem Mecanismo de Logout Automático por Inatividade

**Problema:** A sessão do Firebase Auth persiste indefinidamente. Não há timeout de inatividade.

**Arquivos:** `contexts/AuthContext.tsx`, `components/PrivateRoute.tsx`

**Bloqueia:** Segurança — sessões abertas em computadores compartilhados permanecem ativas permanentemente.

---

## Lacunas de Cobertura de Testes

| Área | O Que Não Tem Teste | Arquivos | Risco | Prioridade |
|------|---------------------|----------|------|------------|
| Validação MN10 | Formatos de data, telefone, tipos de campo | `services/mn10Service.ts:266-426` | Submissões inválidas aceitas | Alta |
| Cálculo de Média | `averageScore` com diferentes escalas | `components/EvaluationForm.tsx:133-155` | Médias incorretas em dashboards | Alta |
| Status de Avaliação | Thresholds aprovação/reprovação | `utils/evaluationUtils.ts:17-64` | Classificação incorreta de motoristas | Alta |
| CRUD Firestore | Todas operações de create/read/update/delete | `services/firebaseService.ts` | Perda/corrupção de dados | Média |
| Geração de PDF | Layout, quebra de página, encoding | `services/pdfService.ts`, `services/mn10PdfService.ts` | PDFs mal formatados | Média |
| Auth Context | Login, logout, permissões | `contexts/AuthContext.tsx` | Falha de autenticação | Média |
| Permissões MN10 | Regras Firestore, visibilidade de campos | `firestore.rules`, `mn10Service.ts` | Dados internos expostos | Alta |
| Upload de Arquivos | Validação de tipo/tamanho, erros Storage | `services/mn10Service.ts:266-306,643-694` | Uploads corrompidos ou não autorizados | Média |

---

*Auditoria de preocupações: 2026-06-01*
