# Guia de Configuração e Operação — LegenTech

Sistema comercial e de engenharia autônomo para venda e entrega de CRM, BI e Software Sob Medida.

---

## 1. Inicialização Rápida em 1 Comando

Para rodar a aplicação localmente:

```bash
# 1. Instalar dependências (se ainda não instalou)
pnpm install

# 2. Iniciar servidor Next.js e motor multiplexado de agentes
pnpm dev
```

Acesse o painel central no navegador:
👉 **`http://localhost:3001`**

---

## 2. Conectar o WhatsApp na Evolution API & Apontar Webhook

O sistema suporta integração oficial com instâncias da **Evolution API** (v1 ou v2).

### 2.1. Configuração de Variáveis no `.env`
```env
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave_global_da_evolution
EVOLUTION_INSTANCE_NAME=legentech
EVOLUTION_WEBHOOK_SECRET=token_secreto_webhook
```

### 2.2. Apontar o Webhook para a Máquina Local
Para que a Evolution API envie as mensagens recebidas para o sistema rodando na sua máquina:

1. Inicie um túnel HTTPS seguro usando **Cloudflare Tunnel** ou **ngrok**:
   ```bash
   # Exemplo via Cloudflare Tunnel
   cloudflared tunnel --url http://localhost:3001

   # Ou via ngrok
   ngrok http 3001
   ```
2. Na Evolution API, aponte a URL do webhook da instância `legentech` para:
   ```
   https://seu-tunnel.trycloudflare.com/api/webhook/evolution
   ```
3. Ative os eventos: `MESSAGES_UPSERT` e `SEND_MESSAGE`.

---

## 3. Configuração do Google Calendar

O agendamento de reuniões de fechamento pode operar em dois modos:

### Modo 1: Link Direto do Google Calendar (Sem Credencial de Serviço)
Basta preencher no `config/business.json` e no `.env`:
```env
GOOGLE_CALENDAR_LINK=https://calendar.app.google/seu_link_de_agendamento
```
O `SdrAgent` enviará os horários e o link oficial diretamente para o cliente no WhatsApp.

### Modo 2: Criação Automática via Service Account (Google Cloud)
1. Crie um projeto no **Google Cloud Console**, ative a **Google Calendar API**.
2. Crie uma **Conta de Serviço (Service Account)** e gere uma chave em formato JSON.
3. Compartilhe sua agenda do Google com o email da Service Account com permissão de "Fazer alterações em eventos".
4. Preencha no `.env`:
   ```env
   GOOGLE_CALENDAR_ID=seu_email@gmail.com
   GOOGLE_CLIENT_EMAIL=service-account@projeto.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

---

## 4. Modo Simulação / `DRY_RUN=true`

O sistema vem configurado por padrão em modo **`DRY_RUN=true`** e **`MOCK_WHATSAPP_ENABLED=true`**.

### O que acontece no modo DRY_RUN?
- **Descoberta real:** o `ScoutAgent` busca empresas reais em Itajubá, Pouso Alegre e Sul de Minas.
- **Auditoria de CRM/BI:** o `AuditorAgent` analisa os gargalos reais e calcula as perdas em R$/mês.
- **Loop de Copywriting:** o `CopywriterAgent` e `CriticAgent` geram a abordagem em 3 balões e validam se está abaixo de 50 palavras e sem jargões.
- **Disparo seguro:** os envios de WhatsApp reais ficam bloqueados ou simulam respostas no painel, permitindo que você inspecione os cards, teste as conversas e aprove antes de ligar o chip.
- **Simulador integrado:** ao clicar em qualquer card no Kanban, você pode:
  - Digitar e enviar como **Operador Humano** (pausando o bot instantaneamente).
  - Clicar em **"Simular Cliente (Texto)"** ou **"Simular Áudio"** para ver a IA transcrevendo o áudio e qualificando o lead via SPIN Selling!

Para ativar o disparo real no WhatsApp: altere `DRY_RUN=false` e `MOCK_WHATSAPP_ENABLED=false` no `.env`.

---

## 5. Como Funciona o Handoff Humano (`HUMAN_LOCKED`)

O maior risco em vendas por WhatsApp é a IA atrapalhar quando o dono está negociando. O sistema resolve isso com duas travas atômicas:

1. **Gatilho de Handoff pela IA:** assim que o cliente pede orçamento/preço, aceita agendar reunião ou faz pergunta técnica crítica:
   - A IA envia mensagem de transição avisando que **Gabriel Valença** assumirá a conversa.
   - O canal do lead é imediatamente travado em **`human_locked`**.
   - O card no Kanban move-se para **`Aguardando Você Fechar` (`waiting_human_closer`)**.
   - Um alerta urgente com resumo executivo é disparado para o seu WhatsApp pessoal (`5512997082889`).
   - A IA **NUNCA** mais responde a esse lead automaticamente enquanto estiver travado.
2. **Detecção de Intervenção Manual no Celular (`fromMe: true`):** se você responder o cliente direto pelo seu WhatsApp no celular, o webhook detecta a mensagem enviada pelo seu aparelho e trava o canal em `human_locked` na hora.
3. **Reativar o Agente:** basta clicar no botão "Destravar / Reativar Agente" no painel ou arrastar o card de volta para uma coluna da IA.

---

## 6. Funil B — Kanban Drag-and-Drop e Fábrica de Software

Quando você fechar a proposta com o cliente:

1. **Arraste o Card no Kanban** para a coluna **`Vendido / Concluído` (`project_approved`)**.
2. **Briefing em 1 Clique (`DealHandoverSpec`):** ao soltar o card, o modal abre já pré-preenchido com tudo que o cliente pediu no WhatsApp (setup, mensalidade e módulos). Clique em **"Confirmar e Iniciar Produção"**.
3. **Execução Autônoma do `ArchitectAgent`:**
   - Lê o dossiê do auditor + conversa do WhatsApp + briefing de fechamento.
   - Cria o workspace do cliente em **`projects/<client-slug>/`**.
   - Gera o **`PRD.md`** completo e as regras **`CLAUDE.md`** exclusivas do cliente.
   - Cria o banco de dados SQLite, schemas, rotas de API, métricas de BI e CRM WhatsApp.
   - Executa a verificação e testes de compilação.
   - O card no Kanban exibe uma **barra de progresso em tempo real** (`Gerando PRD` → `Criando Banco` → `Codando Backend/BI` → `Rodando Testes/Build` → `Sistema Pronto`), movendo o card automaticamente para **`Sistema Pronto / Entregue`**.
   - O sistema notifica seu WhatsApp pessoal com o caminho da pasta pronta para entrega.
