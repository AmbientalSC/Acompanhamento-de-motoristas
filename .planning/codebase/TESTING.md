---
last_mapped_commit: 9aadfa0dd0f09fb5d364ab388fbc6853608b3665
analysis_date: 2026-06-01
---

# Padrões de Teste

**Data da Análise:** 2026-06-01

## Status Atual

**O projeto NÃO possui testes configurados.**

Não foram encontrados:
- Arquivos de teste (`.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`)
- Configuração de framework de teste (`vitest.config.*`, `jest.config.*`)
- Dependências de teste no `package.json`
- Scripts de teste no `package.json`
- Diretório `__tests__/` ou similar

## Framework de Teste

**Runner:** Nenhum configurado

**Assertion Library:** Nenhuma instalada

**Scripts de teste:** Nenhum definido no `package.json`

## O Que Testar (Recomendações para Implementação Futura)

### Áreas Prioritárias para Cobertura

| Área | Arquivos | Risco |
|------|----------|-------|
| Validação de formulários MN10 | `services/mn10Service.ts` (L307-382) | Alto — submissões públicas, dados inválidos podem corromper Firestore |
| Utilitários de máscara/validação | `utils/mn10FieldUtils.ts` | Médio — funções puras, fáceis de testar, críticas para UX |
| Lógica de status de avaliação | `utils/evaluationUtils.ts` | Médio — funções puras com thresholds de nota |
| Autenticação e permissões | `contexts/AuthContext.tsx` | Alto — controle de acesso, regras de autorização |
| Mapeamento de documentos Firestore | `services/firebaseService.ts` (L215-267) | Médio — transformação de dados do Firestore |
| Serviços CRUD MN10 | `services/mn10Service.ts` (L428-809) | Alto — operações críticas com transações |

### Funções Puras Prioritárias

Estas funções não têm dependências externas e são as mais fáceis de testar:

```typescript
// ⭐ utils/mn10FieldUtils.ts — funções puras, sem dependências
applyDateMask(value: string): string
isCompleteMaskedDate(value: string): boolean
maskedDateToIso(value: string): string | null
isoDateToMasked(value: string): string
applyPhoneMask(value: string): string
isCompleteMaskedPhone(value: string): boolean

// ⭐ utils/evaluationUtils.ts — funções puras, thresholds de nota
getEvaluationStatus(score: number, scale?: string): EvaluationStatus
formatStatusWithScore(score: number): string
```

### Estrutura de Teste Recomendada

Seguindo o padrão de projeto já existente (arquivos fonte na raiz), recomenda-se:

```
[raiz]/
├── __tests__/               # OU colocalizado com source
│   ├── utils/
│   │   ├── evaluationUtils.test.ts
│   │   └── mn10FieldUtils.test.ts
│   └── services/
│       └── mn10Service.test.ts
```

**Alternativa colocalizada** (preferível para projetos pequenos):
```
utils/
├── evaluationUtils.ts
├── evaluationUtils.test.ts
├── mn10FieldUtils.ts
└── mn10FieldUtils.test.ts
```

### Framework Recomendado: Vitest

Compatível com a stack existente (Vite 7, TypeScript 5.8) e não requer configuração adicional complexa:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Configuração mínima** (`vite.config.ts` — adicionar ao existente):
```typescript
/// <reference types="vitest" />
export default defineConfig({
  // ...config existente
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test-setup.ts',
  },
});
```

**Setup de teste** (`test-setup.ts`):
```typescript
import '@testing-library/jest-dom';
```

**Scripts** (adicionar ao `package.json`):
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Exemplos de Testes por Tipo de Código

### Utilitários Puros (Prioridade Máxima)

```typescript
// __tests__/utils/mn10FieldUtils.test.ts
import { describe, it, expect } from 'vitest';
import { applyDateMask, isCompleteMaskedDate, maskedDateToIso } from '../../utils/mn10FieldUtils';

describe('applyDateMask', () => {
  it('deve formatar dígitos como dd/mm/aaaa', () => {
    expect(applyDateMask('15082024')).toBe('15/08/2024');
  });

  it('deve limitar a 8 dígitos', () => {
    expect(applyDateMask('150820241234')).toBe('15/08/2024');
  });

  it('deve retornar string vazia para entrada vazia', () => {
    expect(applyDateMask('')).toBe('');
  });

  it('deve ignorar caracteres não numéricos', () => {
    expect(applyDateMask('15/08/2024')).toBe('15/08/2024');
  });
});

describe('isCompleteMaskedDate', () => {
  it('deve aceitar data válida', () => {
    expect(isCompleteMaskedDate('15/08/2024')).toBe(true);
  });

  it('deve rejeitar data inválida (dia 32)', () => {
    expect(isCompleteMaskedDate('32/01/2024')).toBe(false);
  });

  it('deve rejeitar data incompleta', () => {
    expect(isCompleteMaskedDate('15/08')).toBe(false);
  });

  it('deve rejeitar formato inválido', () => {
    expect(isCompleteMaskedDate('2024-08-15')).toBe(false);
  });
});
```

### Serviços com Mock do Firebase

```typescript
// __tests__/services/firebaseService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo firebase antes dos imports
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: () => ({ toMillis: () => Date.now() }) },
}));

import { getTemplates } from '../../services/firebaseService';

describe('getTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar array vazio quando não há templates', async () => {
    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValueOnce({
      forEach: (cb: any) => {}, // sem documentos
    } as any);

    const result = await getTemplates();
    expect(result).toEqual([]);
  });

  it('deve lançar erro com mensagem em português em caso de falha', async () => {
    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Firebase error'));

    await expect(getTemplates()).rejects.toThrow('Falha ao carregar modelos');
  });
});
```

### Lógica de Negócio / Status

```typescript
// __tests__/utils/evaluationUtils.test.ts
import { describe, it, expect } from 'vitest';
import { getEvaluationStatus } from '../../utils/evaluationUtils';

describe('getEvaluationStatus', () => {
  describe('escala 0-10', () => {
    it('deve aprovar nota > 7', () => {
      const result = getEvaluationStatus(8);
      expect(result.status).toBe('approved');
      expect(result.label).toBe('Aprovado');
    });

    it('deve marcar como reavaliar nota entre 6 e 7', () => {
      const result = getEvaluationStatus(6.5);
      expect(result.status).toBe('review');
      expect(result.label).toBe('Reavaliar');
    });

    it('deve reprovar nota < 6', () => {
      const result = getEvaluationStatus(4);
      expect(result.status).toBe('rejected');
      expect(result.label).toBe('Reprovado');
    });

    it('deve aprovar nota exatamente 8', () => {
      const result = getEvaluationStatus(8);
      expect(result.status).toBe('approved');
    });
  });

  describe('escala 1-5', () => {
    it('deve aprovar nota >= 3 na escala 1-5', () => {
      const result = getEvaluationStatus(3, '1-5');
      expect(result.status).toBe('approved');
    });

    it('deve reprovar nota < 3 na escala 1-5', () => {
      const result = getEvaluationStatus(2, '1-5');
      expect(result.status).toBe('rejected');
    });
  });
});
```

### Componentes com Testing Library

```typescript
// __tests__/components/PrivateRoute.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivateRoute from '../../components/PrivateRoute';

// Mock do useAuth
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';

describe('PrivateRoute', () => {
  it('deve mostrar loading enquanto autentica', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: null,
      loading: true,
      // ...outros campos mockados
    } as any);

    render(<PrivateRoute><div>Conteúdo Protegido</div></PrivateRoute>);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('deve renderizar children quando autenticado', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: { uid: '123', email: 'test@test.com' },
      loading: false,
    } as any);

    render(<PrivateRoute><div>Conteúdo Protegido</div></PrivateRoute>);
    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
  });
});
```

### Serviços MN10 com Transações

```typescript
// __tests__/services/mn10Service.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../firebase', () => ({ db: {}, storage: {} }));

import { submitMn10Response } from '../../services/mn10Service';

describe('submitMn10Response', () => {
  it('deve rejeitar formulário com honeypot preenchido (anti-bot)', async () => {
    await expect(
      submitMn10Response({
        publicId: 'test-form',
        answers: {},
        honeypot: 'bot-data',
        userAgent: 'test',
      })
    ).rejects.toThrow('Submissão inválida.');
  });

  it('deve rejeitar publicId vazio', async () => {
    await expect(
      submitMn10Response({
        publicId: '',
        answers: {},
        userAgent: 'test',
      })
    ).rejects.toThrow('Link de formulário inválido.');
  });
});
```

## Cobertura de Código

**Requisito atual:** Nenhum

**Recomendação:** Mirar 80%+ de cobertura para:
- `utils/` (funções puras, alta prioridade)
- `services/mn10Service.ts` (validações e normalizações)
- `services/firebaseService.ts` (mapeamento de documentos)

**Comando sugerido:**
```bash
npx vitest run --coverage
```

## Mocking

**Framework recomendado:** Vitest built-in (`vi.mock`, `vi.fn`, `vi.mocked`)

**O que mockar:**
- Módulo `firebase` (`firebase/firestore`, `firebase/auth`, `firebase/storage`)
- Módulo local `../firebase` (`db`, `auth`, `storage`)
- Contextos React em testes de componente

**O que NÃO mockar:**
- Funções utilitárias puras — testar comportamento real
- Lógica de validação e normalização — testar com dados reais

## Tipos de Teste a Implementar

### Testes Unitários (Prioridade 1)
- **Escopo:** Funções puras em `utils/`, funções de mapeamento/validação em `services/`
- **Abordagem:** Vitest + funções isoladas, sem dependências externas

### Testes de Integração (Prioridade 2)
- **Escopo:** Serviços Firebase com Firestore em modo emulado
- **Abordagem:** Firebase Emulator Suite para Firestore, sem mock

### Testes de Componente (Prioridade 3)
- **Escopo:** Componentes UI isolados (`components/ui/`), componente `PrivateRoute`
- **Abordagem:** React Testing Library + jsdom

### Testes E2E (Não prioritário)
- **Framework:** Playwright ou Cypress (não configurados)
- **Escopo:** Fluxos completos (login → criar avaliação → visualizar dashboard)

## Anti-Padrões Atuais que Dificultam Testes

1. **Services com responsabilidades mistas:** `TemplateManager.tsx` (1185 linhas) gerencia modelos, filiais E usuários em um único componente — difícil de testar isoladamente
2. **Ausência de injeção de dependência:** `firebaseService.ts` importa `db`/`auth` diretamente, sem permitir injeção para testes
3. **console.log de debug em produção:** Dificulta testes de snapshot e verificação de output
4. **Lógica de negócio nos componentes:** `EvaluationForm.tsx` duplica thresholds de status que já existem em `evaluationUtils.ts`
5. **Uso de `any` em tipos:** `fieldValues: Record<string, any>` reduz a capacidade do TypeScript de detectar erros

---

*Análise de testes: 2026-06-01*
