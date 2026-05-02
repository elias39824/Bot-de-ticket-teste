# Bot de Tickets para Discord (JavaScript - Alta Performance)

Este bot foi otimizado para **Uso Público (Multi-Guild)**, com **Painéis Auto-Atualizáveis** e funções avançadas de ticket. Ele suporta múltiplos servidores simultaneamente, mantendo as configurações de cada um totalmente independentes. Ideal para hospedagens como **Shard Cloud**.

## Funcionalidades

- **Painel Interativo**: Menu de seleção para abertura de tickets.
- **Categorias Dinâmicas**: Adicione ou remova categorias via comando `/config`.
- **Nomenclatura Automática**: Canais criados como `categoria-nome_do_usuario`.
- **Sistema de Logs**: Registro de abertura e fechamento de tickets.
-   **Moderação Avançada**: Botões para **Fechar**, **Assumir** e **Notificar Usuário** (pinga o autor do ticket automaticamente).
-   **Painel Dinâmico**: O comando `/config` agora se atualiza sozinho conforme você faz as mudanças.
-   **Categoria de Destino**: Agora você pode definir o ID de uma Categoria para que todos os novos tickets sejam criados dentro dela, mantendo seu servidor organizado.

## Pré-requisitos

- **Node.js v16.11.0** ou superior.
- **pnpm** ou **npm**.

## Instalação

1.  Extraia o arquivo `.zip`.
2.  Abra o terminal na pasta do projeto.
3.  Instale as dependências:
    ```bash
    npm install
    ```

## Configuração

1.  Crie um arquivo chamado `.env` na raiz do projeto.
2.  Adicione o seu token do Discord:
    ```
    DISCORD_TOKEN=SEU_TOKEN_AQUI
    ```
3.  **Personalização de Emojis**: Abra o arquivo `emojis.json` para trocar os emojis dos botões e do painel conforme sua preferência.
4.  Certifique-se de ativar os **Privileged Gateway Intents** (Guild Members, Message Content) no [Portal do Desenvolvedor do Discord](https://discord.com/developers/applications).

## Comandos

-   `/config`: Abre um **Painel Visual** completo. Através dele, você pode usar botões para:
    -   Alterar o **Banner** e a **Descrição**.
    -   Configurar o **ID do Cargo Admin** e o **ID do Canal de Logs**.
    -   **Adicionar Categorias** personalizadas (Nome e Emoji).
    -   **Remover Categorias** existentes.
-   `/cria_ticket`: Envia o painel de tickets configurado para os usuários.

## Execução

Para iniciar o bot e mantê-lo sempre online (recomendado para Shard Cloud), você pode usar o **PM2**:

1. Instale o PM2: `npm install pm2 -g`
2. Inicie o bot: `pm2 start index.js --name "bot-ticket"`
3. Para ver os logs: `pm2 logs`
4. Para reiniciar se cair: `pm2 restart bot-ticket`

Ou inicie normalmente:
```bash
node index.js
```
