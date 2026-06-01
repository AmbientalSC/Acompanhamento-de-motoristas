---
last_mapped_commit: 9aadfa0dd0f09fb5d364ab388fbc6853608b3665
analysis_date: 2026-06-01
---

# Convenções de Código

**Data da Análise:** 2026-06-01

## Idioma

**Código (funções, variáveis, tipos):** Inglês  
**Strings de UI e mensagens de erro:** Português (PT-BR)  
**Comentários:** Português (PT-BR)

Exemplos:

```typescript
// types.ts — tipos em inglês
export interface EvaluationTemplate {
  id: string;
  name: string;
  criteria: string[];
  includeHeader?: boolean;
}

// AuthContext.tsx — mensagens de erro em português
case 'auth/user-not-found':
  errorMessage = 'Usuário não encontrado';
  break;
```

## Nomenclatura

**Arquivos:**
- Componentes: PascalCase, extensão `.tsx` — ex: `EvaluationForm.tsx`, `DriverDashboard.tsx`
- Serviços: camelCase, extensão `.ts` — ex: `firebaseService.ts`, `mn10Service.ts`
- Utilitários: camelCase, sufixo `Utils` — ex: `evaluationUtils.ts`, `mn10FieldUtils.ts`
- Tipos: arquivo único `types.ts` na raiz, não separado por domínio
- Constantes: arquivo único `constants.ts` na raiz
- Configuração: kebab-case com extensão `.cjs` (Tailwind/PostCSS) — ex: `tailwind.config.cjs`

**Funções:**
- camelCase para funções e handlers — ex: `getTemplates`, `handleInputChange`, `saveEvaluation`
- Funções assíncronas sempre usam `async/await`, nunca `.then()` encadeado

```typescript
// Padrão observado (firebaseService.ts)
export const getTemplates = async (): Promise<EvaluationTemplate[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'templates'));
    // ...
    return templates;
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    throw new Error('Falha ao carregar modelos');
  }
};
```

**Variáveis:**
- camelCase — ex: `selectedTemplate`, `isLoadingTemplates`, `formData`
- Estado derivado prefixado com `is`/`has` para booleanos — ex: `isSaving`, `isLoading`, `showSuccess`, `hasActiveFilters`

**Tipos e Interfaces:**
- PascalCase — ex: `EvaluationTemplate`, `MN10Form`, `AuthContextType`
- Props de componentes: sufixo `Props` — ex: `ButtonProps`, `PrivateRouteProps`, `DynamicFieldProps`
- Tipos literais de união: PascalCase — ex: `FieldType`, `UserRole`, `MN10FormStatus`, `MN10QuestionType`

**Constantes:**
- UPPER_SNAKE_CASE para constantes de módulo — ex: `EVALUATION_CRITERIA`, `DEFAULT_TEMPLATE_ID`
- `as const` para arrays constantes que precisam de tipo literal — ex: `constants.ts`

```typescript
// constants.ts
export const EVALUATION_CRITERIA = [
  "Checklist",
  "Cinto de Segurança",
  // ...
] as const;
```

## Estrutura de Arquivos

**Arquivos fonte na raiz do projeto (não em `src/`):**
```
[raiz]/
├── components/          # Componentes React
│   ├── ui/              # Componentes de UI reutilizáveis
│   └── mn10/            # Componentes específicos MN10
│       └── public/      # Rota pública MN10
├── contexts/            # React Contexts (AuthContext)
├── services/            # Lógica de dados/Firebase
├── utils/               # Funções utilitárias puras
├── data/                # Dados estáticos/exemplos
├── scripts/             # Scripts utilitários (.js)
├── public/              # Assets estáticos
├── App.tsx              # Componente raiz
├── index.tsx            # Ponto de entrada
├── types.ts             # TODOS os tipos do projeto
├── constants.ts         # Constantes globais
└── firebase.ts          # Configuração Firebase
```

## Estilo de Código

### Formatação

**Ferramentas:** Nenhuma configurada. O projeto **não possui** ESLint, Prettier ou Biome.

**Padrões observados manualmente:**
- Indentação: 2 espaços
- Linha em branco no início de cada arquivo (presente na maioria)
- JSX multilinha com quebra após abertura de tag
- Atributos JSX em linhas separadas quando são muitos
- Strings: aspas simples preferidas, mas uso inconsistente (aspa dupla em alguns lugares)
- Ponto-e-vírgula: uso inconsistente — alguns arquivos usam, outros não

```typescript
// Exemplo típico de formatação de JSX (EvaluationForm.tsx)
<div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
  <h2 className="text-lg font-semibold text-brand-dark">
    Modelo: <span className="text-brand-primary">{selectedTemplate?.name}</span>
  </h2>
  <Button type="button" onClick={() => setFormStep(1)} variant="secondary" className="!py-1 !px-3 text-sm">
    Trocar Modelo
  </Button>
</div>
```

### TypeScript

Configuração estrita no `tsconfig.json`:
- `strict: true` — todas as verificações estritas ativas
- `noUnusedLocals: true` — variáveis locais não usadas = erro
- `noUnusedParameters: true` — parâmetros não usados = erro
- `noFallthroughCasesInSwitch: true`
- `allowImportingTsExtensions: true` — imports devem incluir extensão `.ts`/`.tsx`
- `noEmit: true` — TypeScript apenas para verificação, Vite cuida do build

**Tipagem de componentes:**
```typescript
// Padrão universal: React.FC com tipo explícito para props
const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', ... }) => { ... };

// Funções utilitárias: tipo de retorno explícito sempre
export const getEvaluationStatus = (score: number, scale?: string): EvaluationStatus => { ... };
```

**Tipos `any`:**
- Uso limitado, principalmente em `fieldValues: Record<string, any>` no tipo `Evaluation`
- Cast `(dataToUpdate as any)` usado em `firebaseService.ts` para adicionar propriedades condicionais

**Tipos condicionais / narrowing:**
```typescript
// Padrão comum: verificação de erro com instanceof
if (error instanceof Error) {
  throw new Error(`Falha ao criar usuário: ${error.message}`);
}
```

### Tailwind CSS

- Classes utilitárias do Tailwind aplicadas diretamente nos elementos JSX
- Cores customizadas definidas em `tailwind.config.cjs`:
  - `brand-primary: #1E40AF`
  - `brand-secondary: #1D4ED8`
  - `brand-accent: #3B82F6`
  - `brand-light: #EFF6FF`
  - `brand-dark: #111827`
- Classes responsivas usam prefixo `sm:`, `md:`, `lg:`, `xl:` — ex: `text-xs sm:text-sm`
- Override de estilos com `!` (important) para forçar Tailwind: `className="!py-1 !px-3"`
- Strings de classe longas quebradas manualmente com template literals, mas sem uso de `clsx` ou `cn()` utility

### Imports

**Ordem observada:**
1. React e hooks (sempre `import React` no topo)
2. Bibliotecas externas (lucide-react, firebase, react-router-dom, recharts)
3. Tipos locais (`import type { ... } from '../types'`)
4. Serviços e utilitários locais
5. Componentes locais

```typescript
// Exemplo típico (EvaluationForm.tsx)
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Save, RotateCcw, Loader2, FileText } from 'lucide-react';
import type { Evaluation, EvaluationTemplate } from '../types';
import { saveEvaluation, getTemplates, getBranches } from '../services/firebaseService';
import { PDFService } from '../services/pdfService';
import RatingSlider from './RatingSlider';
import Card from './ui/Card';
import Button from './ui/Button';
```

**Alias de caminho:** `@/` mapeia para raiz do projeto (definido em `vite.config.ts` e `tsconfig.json`). Uso observado principalmente em `components/ui/` importando de `../../types`.

**Import de tipos:** Usa `import type` para imports que são apenas tipos — ex: `import type { Evaluation, EvaluationTemplate } from '../types';`

## Organização de Componentes

### Componentes de UI (`components/ui/`)

- Cada componente em arquivo próprio
- Props estendem atributos HTML nativos via interface
- `export default` no final do arquivo
- Sem arquivo barrel (index.ts)

```typescript
// Padrão (Button.tsx, Input.tsx, Select.tsx, Card.tsx, Checkbox.tsx)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  // ...
};

export default Button;
```

### Componentes de Página/Feature

- Estado local com múltiplos `useState`
- `useEffect` para carregar dados na montagem
- `useMemo` para valores derivados (analytics, filtros)
- `useCallback` para handlers passados como props
- Estados de loading tratados com spinner `Loader2` + texto "Carregando..."
- Estados vazios com ícone `AlertTriangle` + mensagem descritiva
- Tratamento de erro com `try/catch` + `console.error` + `alert()` para feedback ao usuário

```typescript
// Padrão recorrente em componentes (GeneralDashboard.tsx, DriverDashboard.tsx, etc.)
const [data, setData] = useState<Type[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await getData();
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  fetchData();
}, []);
```

### Context API

- Um contexto global: `AuthContext` em `contexts/AuthContext.tsx`
- Provider wrapper no nível da aplicação (`index.tsx`)
- Hook customizado `useAuth()` que lança erro se usado fora do Provider
- Estado: `currentUser` (Firebase Auth), `systemUser` (perfil Firestore), derivados booleanos (`isAdmin`, `isManager`, `canAccessBranch`, `canManageSystem`, `canAccessMN10`)

```typescript
// Padrão (AuthContext.tsx)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ...
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

## Tratamento de Erros

### Padrão em serviços

- Todas as operações Firestore envolvidas em `try/catch`
- `console.error()` com mensagem descritiva em português
- Relançamento como `new Error()` com mensagem amigável em português
- Fallback com valores padrão em caso de falha (ex: `getBranches` retorna filiais padrão)

```typescript
// firebaseService.ts
export const getBranches = async (): Promise<string[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'branches'));
    // ...
    return branches;
  } catch (error) {
    console.error('Erro ao buscar filiais:', error);
    return ['Central', 'Unidade Sul', 'Unidade Norte']; // fallback
  }
};
```

### Padrão em componentes

- `try/catch` no `handleSubmit` e callbacks
- `alert()` para feedback imediato ao usuário em caso de erro
- `console.error()` para diagnóstico
- `finally` para reset de estado `isSaving`/`isLoading`

```typescript
// EvaluationForm.tsx
try {
  await saveEvaluation(evaluationToSave);
  setShowSuccess(true);
} catch (error) {
  console.error("Falha ao salvar avaliação:", error);
  alert("Falha ao salvar a avaliação. Tente novamente.");
} finally {
  setIsSaving(false);
}
```

### Erros de autenticação

- Mapeamento de códigos Firebase Auth para mensagens em português via `switch/case`
- Códigos mapeados: `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-email`, `auth/too-many-requests`

## Logging

**Framework:** Apenas `console` nativo (sem biblioteca de logging)

**Padrões:**
- `console.error()` — erros em catch blocks (68 ocorrências no código)
- `console.warn()` — falhas não-críticas (6 ocorrências, principalmente cleanup e fallback)
- `console.log()` — debug temporário (especialmente em `evaluationService.ts` legado e `firebaseService.ts`)

**Localização:** Logs sempre em português

## Comentários

**Quando comentar:**
- Cabeçalho de seção com `// --- SEÇÃO ---` para separar blocos lógicos em arquivos grandes
- Comentários de compatibilidade: `// Compatibilidade com templates antigos`
- Linha única `//` para notas breves

**JSDoc:**
- Uso esporádico, apenas em `evaluationUtils.ts` com `@param` e `@returns`
- Não é prática padrão do projeto

```typescript
// evaluationUtils.ts — único arquivo com JSDoc consistente
/**
 * Determina o status de aprovação baseado na nota
 * @param score Nota da avaliação
 * @param scale Escala usada ('1-5' ou '0-10'). Padrão '0-10'.
 * @returns Objeto com informações do status
 */
export const getEvaluationStatus = (score: number, scale?: string): EvaluationStatus => { ... };
```

**TODO/FIXME:**
Apenas 1 ocorrência:
- `services/firebaseService.ts:330` — `// TODO: Implementar atualização de senha de forma segura`

## Design de Funções

**Tamanho:** Funções tendem a ser curtas e focadas nos serviços. Componentes maiores (ex: `EvaluationForm.tsx` com 489 linhas, `TemplateManager.tsx` com 1185 linhas) concentram múltiplas responsabilidades em um único arquivo.

**Parâmetros:**
- Objetos de input tipados para funções com múltiplos parâmetros — ex: `CreateMn10FormInput`, `SubmitMn10ResponseInput`
- Desestruturação de props em componentes

**Retorno:**
- Sempre tipado explicitamente (`Promise<EvaluationTemplate[]>`, `Promise<void>`)
- Funções que podem retornar nulo tipadas com union — ex: `Promise<MN10Form | null>`

## Design de Módulos

**Exports:**
- `export default` para componentes React (exceto `App.tsx` que usa ambos)
- `export const` (named) para funções de serviço e utilitários
- `export type`/`export interface` para tipos em `types.ts`

**Arquivos Barrel:** Não utilizados. Cada import referencia o arquivo diretamente.

## Padrões Específicos

### Firebase / Firestore

- Configuração centralizada em `firebase.ts` (raiz)
- `db` e `auth` exportados como singletons
- Serviços importam `db` e `auth` de `../firebase` (caminho relativo)
- Timestamps Firestore convertidos para millis com `.toMillis()` ao mapear documentos
- IDs de documento usados como chave primária

### Formulários

- Estado gerenciado com `useState` (sem React Hook Form ou Formik)
- Handler genérico `handleInputChange` usando `e.target.name` para atualizar estado
- Validação manual nos serviços (ex: `validateRequiredAnswers`, `validateAnswerFormats`)

### Navegação

- React Router DOM v7 com `BrowserRouter` + basename condicional (GitHub Pages)
- Abas internas gerenciadas com estado `activeTab` + `switch/case` para renderização condicional (sem nested routes)

---

*Análise de convenções: 2026-06-01*
