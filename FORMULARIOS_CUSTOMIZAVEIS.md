# Sistema de Formulários Customizáveis

## Visão Geral

O sistema agora suporta diferentes tipos de campos para criar formulários totalmente customizáveis. Você pode criar formulários para:

- Fichas de entrevista de candidatos
- Avaliações de desempenho de motoristas  
- Checklists de veículos
- Qualquer outro tipo de formulário necessário

## Tipos de Campos Disponíveis

### 1. **Avaliação (Rating)**
- Slider de 1 a 10 pontos
- Usado para avaliar desempenho, qualidade, etc.
- Exemplo: "Pontualidade do motorista"

### 2. **Texto**
- Campo de texto livre
- Suporte a placeholder personalizado
- Exemplo: "Nome completo", "Observações"

### 3. **Múltipla Escolha (Radio)**
- Lista de opções onde apenas uma pode ser selecionada
- Você define as opções e seus valores
- Exemplo: "Estado Civil" com opções "Solteiro", "Casado", etc.

### 4. **Data**
- Seletor de data
- Suporte a placeholder personalizado
- Exemplo: "Data de nascimento", "Data da avaliação"

### 5. **Checkbox**
- Opção verdadeiro/falso
- Exemplo: "Possui CNH", "Necessita treinamento"

## Como Usar

### Criando um Novo Modelo

1. Acesse **Gerenciar Sistema** → **Modelos**
2. Clique em **"Importar Modelos de Exemplo"** para ver exemplos prontos, ou
3. Clique em **"Adicionar Campo"** para criar do zero

### Configurando Campos

Para cada campo você pode definir:
- **Nome**: O título/label que aparecerá no formulário
- **Tipo**: Escolha entre Rating, Texto, Múltipla Escolha, Data ou Checkbox
- **Obrigatório**: Se o campo deve ser preenchido obrigatoriamente
- **Placeholder**: Texto de exemplo (para campos de texto e data)
- **Descrição**: Texto de ajuda que aparece abaixo do campo
- **Opções**: Para campos de múltipla escolha, defina as opções disponíveis

### Campos de Múltipla Escolha

Para campos do tipo "Radio", você precisa definir:
- **Texto da Opção**: O que o usuário vê (ex: "Excelente")
- **Valor da Opção**: O valor salvo no sistema (ex: "excelente")

Exemplo de configuração:
```
Opção 1: Texto = "Excelente" | Valor = "excelente"
Opção 2: Texto = "Bom" | Valor = "bom"  
Opção 3: Texto = "Regular" | Valor = "regular"
```

## Modelos de Exemplo Incluídos

### 1. **Ficha de Entrevista - Admissão**
Formulário completo para entrevistas de candidatos incluindo:
- Dados pessoais (nome, data nascimento, sexo, estado civil)
- Informações de contato (telefone, endereço, CEP)
- Documentos (CPF, RG)
- Escolaridade e experiência profissional
- Informações de saúde

### 2. **Avaliação de Desempenho de Motorista**
Avaliação específica para motoristas com:
- Avaliações de 1-10 (pontualidade, cuidado com veículo, comportamento)
- Opções de múltipla escolha (tipo de rota)
- Checkboxes (uso de EPI, necessita treinamento)
- Campos de texto para observações

### 3. **Checklist de Veículo**
Inspeção completa do veículo incluindo:
- Estado dos componentes (pneus, óleo, freios)
- Funcionamento de equipamentos (luzes, documentação)
- Avaliações de limpeza e conservação
- Data da inspeção e quilometragem

## Vantagens do Sistema

- **Flexibilidade**: Crie formulários para qualquer necessidade
- **Reutilização**: Use o mesmo modelo para múltiplas avaliações
- **Validação**: Campos obrigatórios garantem dados completos
- **Organização**: Diferentes tipos de campo para diferentes tipos de dados
- **Histórico**: Todas as respostas ficam salvas e organizadas

## Migração de Modelos Antigos

O sistema mantém compatibilidade com modelos antigos que usavam apenas campos de avaliação (1-10). Estes modelos continuarão funcionando normalmente e podem ser editados para usar os novos tipos de campo.

## Próximos Passos

Após criar seu modelo customizado:
1. Use-o no formulário de **Nova Avaliação**
2. Visualize os resultados no **Dashboard**
3. Gere relatórios em PDF com todas as informações coletadas

O sistema automaticamente se adapta para exibir e processar todos os tipos de campo que você configurar.
