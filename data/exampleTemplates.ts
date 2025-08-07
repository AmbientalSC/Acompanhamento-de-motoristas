import { EvaluationTemplate } from '../types';

// Modelos de exemplo para demonstrar os novos tipos de campos
export const exampleTemplates: Omit<EvaluationTemplate, 'id'>[] = [
  {
    name: "Ficha de Entrevista - Admissão",
    criteria: [], // Mantido para compatibilidade
    criteriaConfig: [
      {
        id: "nome",
        name: "Nome Completo",
        type: "text",
        required: true,
        placeholder: "Digite o nome completo do candidato"
      },
      {
        id: "data-nascimento",
        name: "Data de Nascimento",
        type: "date",
        required: true,
        description: "Data de nascimento do candidato"
      },
      {
        id: "sexo",
        name: "Sexo",
        type: "radio",
        required: true,
        options: [
          { label: "Feminino", value: "feminino" },
          { label: "Masculino", value: "masculino" }
        ]
      },
      {
        id: "estado-civil",
        name: "Estado Civil",
        type: "radio",
        required: true,
        options: [
          { label: "Solteiro(a)", value: "solteiro" },
          { label: "Casado(a)", value: "casado" },
          { label: "União Estável", value: "uniao_estavel" },
          { label: "Divorciado(a)", value: "divorciado" },
          { label: "Viúvo(a)", value: "viuvo" }
        ]
      },
      {
        id: "escolaridade",
        name: "Escolaridade",
        type: "radio",
        required: true,
        options: [
          { label: "Analfabeto", value: "analfabeto" },
          { label: "Fundamental", value: "fundamental" },
          { label: "Médio", value: "medio" },
          { label: "Superior", value: "superior" },
          { label: "Incompleto", value: "incompleto" },
          { label: "Completo", value: "completo" }
        ]
      },
      {
        id: "telefone",
        name: "Telefone",
        type: "text",
        required: true,
        placeholder: "(00) 00000-0000"
      },
      {
        id: "cpf",
        name: "CPF",
        type: "text",
        required: true,
        placeholder: "000.000.000-00"
      },
      {
        id: "rg",
        name: "RG",
        type: "text",
        required: true,
        placeholder: "0.000.000"
      },
      {
        id: "endereco",
        name: "Endereço",
        type: "text",
        required: true,
        placeholder: "Rua, número, bairro"
      },
      {
        id: "cep",
        name: "CEP",
        type: "text",
        required: true,
        placeholder: "00000-000"
      },
      {
        id: "primeiro-emprego",
        name: "É o primeiro emprego?",
        type: "checkbox",
        required: false,
        description: "Marque se esta é a primeira experiência de trabalho"
      },
      {
        id: "problema-saude",
        name: "Possui algum problema de saúde?",
        type: "radio",
        required: true,
        options: [
          { label: "Sim", value: "sim" },
          { label: "Não", value: "nao" }
        ]
      },
      {
        id: "observacoes",
        name: "Observações Gerais",
        type: "text",
        required: false,
        placeholder: "Informações adicionais sobre o candidato",
        description: "Campo para anotações complementares do entrevistador"
      }
    ]
  },
  {
    name: "Avaliação de Desempenho de Motorista",
    criteria: [], // Mantido para compatibilidade
    criteriaConfig: [
      {
        id: "pontualidade",
        name: "Pontualidade",
        type: "rating",
        required: true,
        description: "Avalie a pontualidade do motorista (1-10)"
      },
      {
        id: "cuidado-veiculo",
        name: "Cuidado com o Veículo",
        type: "rating",
        required: true,
        description: "Como o motorista cuida e mantém o veículo"
      },
      {
        id: "comportamento-transito",
        name: "Comportamento no Trânsito",
        type: "rating",
        required: true,
        description: "Respeito às leis de trânsito e direção defensiva"
      },
      {
        id: "relacionamento-equipe",
        name: "Relacionamento com a Equipe",
        type: "rating",
        required: true,
        description: "Capacidade de trabalhar em equipe"
      },
      {
        id: "uso-epi",
        name: "Uso correto de EPI",
        type: "checkbox",
        required: true,
        description: "Motorista utiliza equipamentos de proteção individual"
      },
      {
        id: "tipo-rota",
        name: "Tipo de Rota Principal",
        type: "radio",
        required: true,
        options: [
          { label: "Urbana", value: "urbana" },
          { label: "Rural", value: "rural" },
          { label: "Mista", value: "mista" },
          { label: "Interestadual", value: "interestadual" }
        ]
      },
      {
        id: "data-avaliacao",
        name: "Data da Avaliação",
        type: "date",
        required: true,
        description: "Data em que foi realizada esta avaliação"
      },
      {
        id: "observacoes-gerais",
        name: "Observações Gerais",
        type: "text",
        required: false,
        placeholder: "Comentários adicionais sobre o desempenho do motorista"
      },
      {
        id: "necessita-treinamento",
        name: "Necessita treinamento adicional?",
        type: "checkbox",
        required: false,
        description: "Marque se o motorista precisa de capacitação adicional"
      },
      {
        id: "areas-melhoria",
        name: "Principais áreas de melhoria",
        type: "text",
        required: false,
        placeholder: "Descreva as áreas que precisam ser aprimoradas"
      }
    ]
  },
  {
    name: "Checklist de Veículo",
    criteria: [], // Mantido para compatibilidade
    criteriaConfig: [
      {
        id: "estado-pneus",
        name: "Estado dos Pneus",
        type: "radio",
        required: true,
        options: [
          { label: "Excelente", value: "excelente" },
          { label: "Bom", value: "bom" },
          { label: "Regular", value: "regular" },
          { label: "Ruim", value: "ruim" },
          { label: "Crítico", value: "critico" }
        ]
      },
      {
        id: "nivel-oleo",
        name: "Nível do Óleo",
        type: "radio",
        required: true,
        options: [
          { label: "Normal", value: "normal" },
          { label: "Baixo", value: "baixo" },
          { label: "Crítico", value: "critico" }
        ]
      },
      {
        id: "funcionamento-freios",
        name: "Funcionamento dos Freios",
        type: "rating",
        required: true,
        description: "Avalie o funcionamento dos freios (1-10)"
      },
      {
        id: "luzes-funcionando",
        name: "Todas as luzes funcionando",
        type: "checkbox",
        required: true,
        description: "Faróis, lanternas, setas e luzes de freio"
      },
      {
        id: "limpeza-interna",
        name: "Limpeza Interna",
        type: "rating",
        required: true,
        description: "Estado de limpeza do interior do veículo"
      },
      {
        id: "limpeza-externa",
        name: "Limpeza Externa",
        type: "rating",
        required: true,
        description: "Estado de limpeza da parte externa do veículo"
      },
      {
        id: "documentos-veiculo",
        name: "Documentos do veículo em dia",
        type: "checkbox",
        required: true,
        description: "CRLV, IPVA, seguro obrigatório"
      },
      {
        id: "data-inspecao",
        name: "Data da Inspeção",
        type: "date",
        required: true
      },
      {
        id: "quilometragem",
        name: "Quilometragem Atual",
        type: "text",
        required: true,
        placeholder: "000.000 km"
      },
      {
        id: "problemas-identificados",
        name: "Problemas Identificados",
        type: "text",
        required: false,
        placeholder: "Descreva qualquer problema encontrado durante a inspeção"
      }
    ]
  }
];

export default exampleTemplates;
