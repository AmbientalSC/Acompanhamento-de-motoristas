# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

SPA de avaliação e acompanhamento de motoristas da Ambiental. React 19 + TypeScript 5.8 (strict) + Vite 7 + Tailwind 3 + Firebase 12 (Auth, Firestore, Storage, Analytics; projeto `motoristas-f4aed`). Não é monorepo e **não há `src/`**: os fontes ficam na raiz (`components/`, `services/`, `contexts/`, `utils/`, `data/`, `types.ts`, `firebase.ts`). Todo código, UI, comentários e mensagens de erro são em **pt-BR**.

## Comandos

```bash
npm run dev        # Vite, base '/'
npm run build      # Vite → dist/ (base '/Acompanhamento-de-motoristas/'); NÃO faz typecheck
npm run preview
npx tsc --noEmit   # único typecheck disponível (~10s)
```

- **Não existem** testes, lint nem format — não rode `npm test`/`lint`/`format`.
- `tsc --noEmit` hoje já falha com 1 erro pré-existente (`mn10Service.ts:498`, tipo `Record<string, unknown>` em `updateDoc`). `noUnusedLocals`/`noUnusedParameters` estão ligados — não introduza novos erros.
- Deploy é feito pelo CI a cada push em `main`. `npm run deploy` (gh-pages CLI) não deve ser usado localmente.
- `firestore.rules` e `storage.rules` são versionadas, mas **o CI não as publica** — precisam ser aplicadas manualmente com a Firebase CLI (`firebase.json`/`.firebaserc` apontam para `motoristas-f4aed`).

## Arquitetura

### Fluxo de entrada e autorização

`index.tsx` → `BrowserRouter` (basename = `import.meta.env.BASE_URL`) → `AuthProvider` → rotas:
- `/mn10/f/:publicId` → `MN10PublicFormPage`, **público**, fora do `PrivateRoute`.
- `/*` → `PrivateRoute` (mostra `Login` se não autenticado) → `App`.

`App.tsx` **não usa rotas internas**: a navegação é um `useState<Tab>` com `switch`. Uma "página" nova é uma aba nova em `App.tsx`, condicionada por `canManageSystem` (admin) ou `canAccessMN10`.

`AuthContext` faz login no Firebase Auth e depois carrega **toda** a coleção `users` (`getUsers()`), procurando o perfil ativo por `authUID`/`id` ou, como fallback, por e-mail. `ensureUserDocumentByAuthUID` migra documentos legados para `users/{uid}` e apaga o documento antigo. Se não houver perfil ativo, `systemUser` fica `null` (logado, mas sem permissões).

Perfis: `admin` (tudo) e `manager`. `canAccessMN10` = admin ou flag no perfil. **A autorização é só no cliente**: as regras do Firestore para `templates`, `evaluations`, `branches` e `users` liberam leitura/escrita a qualquer usuário autenticado. `canAccessBranch` existe no contexto mas **nenhum componente o usa** — managers não são filtrados por filial hoje.

### Camada de dados

- `services/firebaseService.ts` é o serviço real (CRUD de templates, avaliações, filiais, usuários). Padrão: `try/catch` com `console.error` e `throw new Error('<mensagem pt-BR>')`.
- `services/evaluationService.ts` é um **mock em memória legado**. Só é importado por `components/Dashboard.tsx`, que por sua vez não é usado por `App`. Não use nem modifique.
- Os mappers de leitura (`getTemplates`, `getEvaluations`) copiam campos **explicitamente**: ao adicionar um campo em `Evaluation` ou no template, inclua-o no mapper, senão ele é gravado mas não é relido (`DriverDashboard`/`pdfService` dependem de `ratingScale` e `nomeColaborador`, por exemplo — avaliação RH é detectada por `!!nomeColaborador`).
- O Firestore **rejeita `undefined`** (`firebase.ts` não ativa `ignoreUndefinedProperties`): grave `null`/`''`. `saveTemplate`/`updateTemplate` gravam `null` nos campos de cabeçalho e `getTemplates` converte de volta para `undefined`; critérios usam `''` como padrão (`imageUrl`, `imagePath`, `correctAnswer`).
- Firestore é inicializado com `experimentalForceLongPolling: true` e `experimentalAutoDetectLongPolling: false` em `firebase.ts` — **não remover** (restrição de conectividade da rede).
- Datas: ISO `YYYY-MM-DD` no Firestore, `DD/MM/YYYY` na UI. `Timestamp` → `.toMillis()` (number) nos tipos.

### Templates e avaliações (`types.ts`)

- `EvaluationTemplate` tem dois formatos de critérios: `criteria: string[]` (legado) e `criteriaConfig: EvaluationCriterion[]` (atual). Leitura deve tratar ambos; escrita usa `criteriaConfig`.
- O cabeçalho do formulário é definido por `headerType` (`'evaluation'` | `'rh'`; `undefined` = sem cabeçalho/média). `includeHeader` é o campo legado que `EvaluationForm` só consulta quando `headerType` está ausente. `isFormOnly` marca formulários sem avaliação.
- Tipos de campo: `rating` (0–10), `rating-5` (1–5), `text`, `number`, `radio`, `date`, `checkbox`. Notas **iniciam sem valor** e são desmarcáveis: "sem nota" = **chave ausente em `scores`** (nunca `null`, que quebraria `.toFixed`/somas nos dashboards e no PDF); a média considera só as notas respondidas e é omitida se não houver nenhuma; nota `required` sem resposta bloqueia o envio. A `ratingScale` salva na avaliação é `'1-5'` somente se **todos** os campos de nota do template forem `rating-5`; caso contrário `'0-10'`. `utils/evaluationUtils.ts#getEvaluationStatus` usa a escala (1-5: ≥3 aprova; 0-10: >7 aprova, ≥6 reavaliar, resto reprova).
- **Imagem na pergunta**: atributo opcional de qualquer critério (`imageUrl` + `imagePath`), enviado ao Storage em `templates/images/{uuid}/{arquivo}` por `services/templateImageService.ts` **só ao salvar o modelo** (upload adiado; arquivos trocados/removidos são apagados depois, e os enviados são desfeitos se o salvamento falhar). Escrita só para admin (`isAdmin()` em `storage.rules`, que também limita 5 MB e jpeg/png/webp — manter em sincronia com o serviço). `QuestionImage` só exibe URLs de `firebasestorage.googleapis.com`.
- Tipo `number`: resposta digitada; `options` funcionam como **legenda** (lista suspensa aberta ao clicar na imagem ou em "Ver opções"), não como resposta.
- **Gabarito**: `correctAnswer` por critério `text`/`number`/`radio` (`utils/gradingUtils.ts#gradeEvaluation`). O resultado é gravado em `Evaluation.grading` como **snapshot** (editar o gabarito depois não altera avaliações antigas) e mostrado na tela de resultado (passo 3 do `EvaluationForm`, `EvaluationResult`), no `FormsViewer` e no PDF. `fieldValues` é indexado pelo **nome** do critério ao salvar, mas a correção roda antes disso, com ids.
- O editor de critérios fica em `components/templates/CriterionEditor.tsx`; `TemplateManager` concentra estado, upload e salvamento.
- `data/exampleTemplates.ts` alimenta a ação de importar exemplos em `TemplateManager`. `constants.ts` (`EVALUATION_CRITERIA`) não é importado por ninguém.

### MN10 (formulários dinâmicos públicos)

Fluxo de ponta a ponta, espalhado por `services/mn10Service.ts`, `MN10PublicFormPage.tsx`, `MN10Dashboard.tsx`, `firestore.rules` e `storage.rules`:

1. Staff cria o formulário (`draft` → `published` → `closed`) com perguntas (`MN10Question`); `publicId` é único (padrão `MMAAAA`, com sufixo `-2`, `-3`…).
2. Público abre `/mn10/f/:publicId` sem login (as regras permitem leitura só de formulários `published`) e envia: `submitMn10Response` valida (honeypot, obrigatórios, máscaras de data/telefone), sobe anexos para `mn10/uploads/{formId}/{responseId}/{questionId}/…` no Storage, grava `mn10Forms/{formId}/responses/{responseId}` com um **`questionSnapshot`** (cópia congelada das perguntas na hora do envio) e incrementa `responseCount` numa transaction (falha tolerada).
3. Perguntas `visibility: 'internal'` não aparecem no formulário público; `internalAnswers` nasce vazio (as regras exigem isso na criação) e só é preenchido depois por staff (`updateMn10InternalAnswers`). `file_upload` é sempre público.

A validação existe **em três lugares que precisam ficar sincronizados**: `MN10PublicFormPage` (cliente), `mn10Service` e as regras (`hasOnlyAllowedResponseKeys`, limites de tamanho, 10 MB, `image/*` ou PDF). Mudar o shape de `MN10Response` ou de uma pergunta exige mexer nos três.

### PDF

`jspdf` + `html2canvas`. `services/pdfService.ts` (avaliação individual — com bloco "RESULTADO DO TESTE" quando há `grading`, sem imagens — e análise por motorista; carrega o logo `./ambiental.svg` via canvas) e `services/mn10PdfService.ts` (respostas MN10).

## GitHub Pages (armadilhas)

- `vite.config.ts`: `base` = `/` em dev e `/Acompanhamento-de-motoristas/` em produção. Referências a assets usam caminho relativo (`./ambiental.svg`).
- Rotas client-side só funcionam em produção por causa do hack `spa-github-pages` (script inline em `index.html` + `public/404.html`, com `pathSegmentsToKeep = 1`). Não remova nenhum dos dois.
- `.github/workflows/` tem **dois workflows** disparados em push na `main`, ambos publicando no Pages, com Node 18: `deploy-gh-pages.yml` (`npm ci` + `peaceiris/actions-gh-pages`) e `deploy.yml` (apaga `package-lock.json` e roda `npm install --legacy-peer-deps` + `actions/deploy-pages`). Dependência nova precisa instalar nos dois modos.
- `index.html` tem um `importmap` apontando `react`, `react-dom`, `lucide-react` e `recharts` para `esm.sh` (resíduo do template do AI Studio). O bundle de produção **não** referencia `esm.sh` (React vem do `node_modules`), então o importmap é inerte — confirme antes de mexer.
- `vite.config.ts` injeta `process.env.GEMINI_API_KEY`/`API_KEY` a partir do `.env`, mas nenhum código os usa.

## Convenções e armadilhas

- Estilização apenas com Tailwind (sem CSS modules). Cores: `brand-primary` `#1E40AF`, `brand-secondary` `#1D4ED8`, `brand-accent` `#3B82F6`, `brand-light` `#EFF6FF`, `brand-dark` `#111827` (`tailwind.config.cjs`). O `content` do Tailwind lista diretórios explicitamente (**não inclui `data/`**); classes novas em um diretório novo só são geradas se ele for adicionado lá.
- `index.css` da raiz é o ativo (importado como `./index.css?import` em `index.tsx`). `public/index.css` é uma cópia quase idêntica e provavelmente morta — edite sempre o da raiz.
- O alias `@/` → raiz (e **não** `src/`) está em `tsconfig.json` e `vite.config.ts`, mas o código existente usa só imports relativos.
- IDs de usuário são sempre o `uid` do Firebase Auth.
- `scripts/createAdminUser.js`, `scripts/migrateUsers.js` e `components/UserMigration.tsx` são arquivos vazios (0 bytes); nada os importa, mas confirme antes de remover.
- Arquivos grandes — refatorar em subcomponentes antes de acrescentar features: `components/TemplateManager.tsx` (~1260 linhas) e `components/mn10/MN10Dashboard.tsx` (~1150 linhas).
