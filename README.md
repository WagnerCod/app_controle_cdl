# App Controle CDL

Aplicativo móvel para Geração e Conferência de Cargas do CDL (Centro de Distribuição e Logística) com arquitetura **Offline-First**.

## 📋 Sobre o Projeto

Este aplicativo permite que operadores do CDL e conferentes realizem:
- **Criação de Cargas**: Montagem de romaneios com bipagem de volumes
- **Conferência de Cargas**: Validação de volumes recebidos com controle de faltantes
- **Operação Offline**: Todas as operações funcionam sem conectividade, com sincronização automática em background

## 🚀 Stack Tecnológica

- **Ionic 7+**: Framework UI com componentes nativos
- **Angular 17+**: Framework JavaScript com NgModules
- **Apache Cordova**: Acesso a recursos nativos do dispositivo
- **TypeScript**: Linguagem com strict mode habilitado
- **SQLite**: Banco de dados local para persistência offline
- **RxJS**: Programação reativa e gerenciamento de estado

## ✨ Características Principais

### Offline-First
- Todas operações salvam localmente primeiro
- Sincronização automática em background a cada 30 segundos
- Fila de sincronização com retries exponenciais
- Idempotência garantida com X-Idempotency-Key

### Indicadores Visuais
- 🟢 Verde: Online - Sincronizado
- 🟡 Amarelo: Online - Sincronizando (X itens)
- 🔴 Vermelho: Offline (com contagem de pendentes)

### UX Operacional
- Feedback tátil (vibração) em operações
- Som opcional configurável
- Fontes grandes e alto contraste
- Botões grandes para facilitar uso em campo

## 📱 Funcionalidades

### RF-001 e RF-002: Criação de Carga
- Seleção de destino
- Bipagem de volumes com scanner
- Lista em tempo real de volumes
- Totalizador de volumes adicionados
- Fechar/Finalizar carga

### RF-003: Listagem de Cargas
- Filtros por status, destino, período
- Cards com informações resumidas
- Navegação para detalhes

### RF-004: Conferências Pendentes
- Lista de cargas aguardando conferência
- Filtro por filial do usuário

### RF-005, RF-006, RF-007: Conferência de Volumes
- Bipagem de volumes para conferência
- Totalizador grande: Conferidos / Faltantes
- Lista de volumes com status visual
- Justificativa obrigatória para faltantes (RN-013)

### RF-008: Painel Resumo
- Cards com contadores:
  - Cargas Abertas
  - Cargas Fechadas
  - Conferências Pendentes
- Ações rápidas

### RF-009: Autenticação e Contexto
- Login com seleção obrigatória de:
  - Empresa
  - Filial
  - Aglomerado
- Contexto salvo em localStorage

### RF-010: Ajustes
- Ativar/desativar vibração na bipagem
- Ativar/desativar som na bipagem
- Forçar sincronização manual
- Limpar cache local
- Exibir versão do app

## 🔧 Instalação

### Pré-requisitos
- Node.js 18+ e npm
- Ionic CLI: `npm install -g @ionic/cli`
- Cordova: `npm install -g cordova`
- Android Studio (para build Android)
- Java JDK 17+

### Instalação Rápida

```bash
# Clone o repositório
git clone https://github.com/WagnerCod/app_controle_cdl.git
cd app_controle_cdl

# Instale as dependências
npm install

# Execute no navegador (modo de desenvolvimento)
ionic serve

# Ou execute com live reload
npm start
```

### Build para Android

```bash
# Adicione a plataforma Android
ionic cordova platform add android

# Build de desenvolvimento
ionic cordova build android

# Build de produção
ionic cordova build android --prod --release
```

## 📖 Documentação Adicional

- [INSTALL.md](./INSTALL.md) - Guia detalhado de instalação e configuração
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura Offline-First explicada
- [SQL_SCHEMA.md](./SQL_SCHEMA.md) - Esquema do banco de dados SQLite

## 🗂️ Estrutura do Projeto

```
app_controle_cdl/
├── config.xml              # Configuração Cordova
├── package.json            # Dependências Node.js
├── angular.json            # Configuração Angular
├── ionic.config.json       # Configuração Ionic
├── src/
│   ├── app/
│   │   ├── services/       # Serviços (Database, Sync, API, Context)
│   │   ├── guards/         # Guards de rota (Auth, Context)
│   │   ├── pages/          # Páginas da aplicação
│   │   │   ├── login/
│   │   │   ├── home/
│   │   │   ├── carga/
│   │   │   │   ├── criar/
│   │   │   │   └── listar/
│   │   │   ├── conferencia/
│   │   │   │   ├── pendentes/
│   │   │   │   └── detalhes/
│   │   │   └── ajustes/
│   │   ├── components/     # Componentes compartilhados
│   │   │   └── network-status/
│   │   ├── app.module.ts
│   │   ├── app.component.ts
│   │   └── app-routing.module.ts
│   ├── theme/              # Temas e estilos
│   │   └── variables.scss
│   ├── global.scss
│   └── index.html
└── doc.txt                 # Documentação original do requisito
```

## 🔒 Regras de Negócio Implementadas

- **RN-001**: Volume pertence a uma única carga
- **RN-002**: Bipagens duplicadas são idempotentes (alerta não-bloqueante)
- **RN-004**: Apenas volumes da empresa/filial do contexto podem ser agregados
- **RN-005**: Conferência valida se volume pertence à carga
- **RN-006**: Finalização com faltantes exige justificativa
- **RN-010**: Auditoria em operações críticas
- **RN-011**: Remover volume só em status EM_MONTAGEM
- **RN-012**: Reabrir carga só se status FECHADA
- **RN-013**: Justificativa obrigatória para faltantes (mín. 10 caracteres)

## 🧪 Testes

```bash
# Executar testes unitários
npm test

# Executar testes com coverage
npm run test:coverage
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é proprietário da empresa. Todos os direitos reservados.

## 👥 Autores

- **Wagner Cod** - Desenvolvedor Principal
- **Yasmin Cruz** - Requisitos e Validação (Suprimentos)
- **Sherman Vendramini** - Gestor de TI

## 📞 Suporte

Para suporte, envie um email para dev@cdl.com.br ou abra uma issue no GitHub.

---

**Versão Atual**: 0.1.0 (Beta)
**Última Atualização**: Novembro 2025
