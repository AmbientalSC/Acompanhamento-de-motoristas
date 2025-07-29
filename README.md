# Acompanhamento de Motoristas - Ambiental

Sistema web para avaliação e acompanhamento de performance de motoristas, desenvolvido com React, TypeScript e Firebase.

## 🚀 Funcionalidades

- **Sistema de Autenticação** com Firebase Auth
- **Formulários de Avaliação Customizáveis** com templates dinâmicos
- **Dashboards Analíticos** com gráficos e KPIs
- **Análise Individual** por motorista
- **Gerenciamento de Templates** de avaliação
- **Relatórios e Filtros** avançados

## 🛠️ Tecnologias

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Analytics)
- **Gráficos**: Recharts
- **Ícones**: Lucide React

## 📦 Instalação e Desenvolvimento

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn

### Instalação Local

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/Acompanhamento-de-motoristas.git
cd Acompanhamento-de-motoristas
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o projeto em modo de desenvolvimento:
```bash
npm run dev
```

4. Acesse `http://localhost:5173` no seu navegador

## 🚀 Deploy no GitHub Pages

O projeto está configurado para deploy automático no GitHub Pages.

### Deploy Automático (Recomendado)

1. Faça push das suas alterações para a branch `main`:
```bash
git add .
git commit -m "Atualizações do projeto"
git push origin main
```

2. O GitHub Actions irá automaticamente:
   - Fazer build do projeto
   - Criar/atualizar a branch `gh-pages` com os arquivos de produção
   - Deployar para o GitHub Pages
   - Disponibilizar em: `https://seu-usuario.github.io/Acompanhamento-de-motoristas/`

### Deploy Manual

1. Faça o build do projeto:
```bash
npm run build
```

2. O arquivo de workflow `.github/workflows/deploy.yml` irá automaticamente fazer o deploy quando você fizer push para a branch `main`.

## 📁 Estrutura do Projeto

```
Acompanhamento-de-motoristas/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI reutilizáveis
│   └── ...             # Componentes específicos
├── contexts/           # Contextos React (Auth)
├── services/           # Serviços (Firebase)
├── public/             # Arquivos estáticos
├── .github/workflows/  # GitHub Actions
└── ...
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Executa o servidor de desenvolvimento
- `npm run build` - Gera o build de produção
- `npm run preview` - Preview do build de produção

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

Desenvolvido para **Ambiental Limpeza Urbana e Saneamento Ltda**
