# 🍖 Assados do Jeferson - Gestão e WhatsApp com IA Gemini

Sistema completo de atendimento via WhatsApp, cardápio digital web, pesagem real na balança, controle de caixa financeiro e gestão de cozinha com sincronização em tempo real.

---

## ⚡ Sincronização em Tempo Real (Zero Latência)

Assim que um cliente confirma um pedido pelo link de pedidos web (`/?view=cardapio`), formulário ou WhatsApp IA:
1. **Server-Sent Events (SSE)** (`/api/events`) transmite imediatamente o evento `NEW_ORDER` para todos os painéis administrativos conectados.
2. **BroadcastChannel API** (`assados_orders_channel`) notifica instantaneamente outras abas do mesmo navegador sem delay.
3. **Alerta Sonoro & Toast** dispara no monitor do balcão e cozinha com sinal sonoro e destaque visual.
4. **Fluxo de Caixa** e contadores são recalculados automaticamente.

---

## 🚀 Como Executar o Projeto

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor em desenvolvimento
npm run dev

# 3. Gerar build de produção
npm run build

# 4. Iniciar em modo de produção
npm run start
```

---

## 📱 Cardápio Web para Clientes
Acesse `http://localhost:3000/?view=cardapio` para visualizar o aplicativo do cliente com catálogo interativo, seleção de carnes por peso estimado, acompanhamentos, cálculo automático de frete por bairro e chave PIX.
