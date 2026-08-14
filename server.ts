import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './server/db';
import {
  processChatMessage,
  generateWhatsAppReceiptText,
  generateWeightAdjustmentWhatsAppText,
  generateKitchenOrderText
} from './server/chatbotEngine';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- REAL-TIME SSE (SERVER-SENT EVENTS) CLIENTS ---
  const sseClients = new Set<Response>();

  function broadcastServerEvent(type: string, data: any) {
    const message = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
    sseClients.forEach(client => {
      try {
        client.write(message);
      } catch (err) {
        sseClients.delete(client);
      }
    });
  }

  // SSE Stream Endpoint
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Chat Endpoint for Web / Simulator & Meta incoming
  app.post('/api/chat/message', async (req: Request, res: Response) => {
    try {
      const { sessionId, text, phone } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const result = await processChatMessage(sessionId, text || '', phone);
      if (result.orderCreated) {
        broadcastServerEvent('NEW_ORDER', result.orderCreated);
      }
      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/chat/message:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Get Session Info
  app.get('/api/chat/session/:sessionId', (req: Request, res: Response) => {
    const session = db.getSession(String(req.params.sessionId));
    res.json(session);
  });

  // Reset Session
  app.post('/api/chat/reset/:sessionId', (req: Request, res: Response) => {
    db.clearSession(String(req.params.sessionId));
    const newSession = db.getSession(String(req.params.sessionId));
    res.json({ success: true, session: newSession });
  });

  // --- DATABASE: PRODUCTS ---
  app.get('/api/database/products', (req: Request, res: Response) => {
    res.json(db.getProducts());
  });

  app.post('/api/database/products', (req: Request, res: Response) => {
    const newProd = db.addProduct(req.body);
    broadcastServerEvent('PRODUCTS_CHANGED', { products: db.getProducts(), updated: newProd });
    res.status(201).json(newProd);
  });

  app.put('/api/database/products/:id', (req: Request, res: Response) => {
    const updated = db.updateProduct(String(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Produto não encontrado' });
    broadcastServerEvent('PRODUCTS_CHANGED', { products: db.getProducts(), updated });
    res.json(updated);
  });

  app.delete('/api/database/products/:id', (req: Request, res: Response) => {
    const ok = db.deleteProduct(String(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Produto não encontrado' });
    broadcastServerEvent('PRODUCTS_CHANGED', { products: db.getProducts(), deletedId: req.params.id });
    res.json({ success: true });
  });

  // --- DATABASE: DELIVERY TAXES ---
  app.get('/api/database/delivery-taxes', (req: Request, res: Response) => {
    res.json(db.getDeliveryTaxes());
  });

  app.post('/api/database/delivery-taxes', (req: Request, res: Response) => {
    const newTax = db.addDeliveryTax(req.body);
    broadcastServerEvent('TAXES_CHANGED', { taxes: db.getDeliveryTaxes(), updated: newTax });
    res.status(201).json(newTax);
  });

  app.put('/api/database/delivery-taxes/:id', (req: Request, res: Response) => {
    const updated = db.updateDeliveryTax(String(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Taxa não encontrada' });
    broadcastServerEvent('TAXES_CHANGED', { taxes: db.getDeliveryTaxes(), updated });
    res.json(updated);
  });

  app.delete('/api/database/delivery-taxes/:id', (req: Request, res: Response) => {
    const ok = db.deleteDeliveryTax(String(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Taxa não encontrada' });
    broadcastServerEvent('TAXES_CHANGED', { taxes: db.getDeliveryTaxes(), deletedId: req.params.id });
    res.json({ success: true });
  });

  // --- DATABASE: ORDERS ---
  app.get('/api/database/orders', (req: Request, res: Response) => {
    res.json(db.getOrders());
  });

  app.post('/api/database/orders', (req: Request, res: Response) => {
    const created = db.createOrder(req.body);
    broadcastServerEvent('NEW_ORDER', created);
    res.status(201).json(created);
  });

  app.patch('/api/database/orders/:id/status', (req: Request, res: Response) => {
    const { status } = req.body;
    const updated = db.updateOrderStatus(String(req.params.id), status);
    if (!updated) return res.status(404).json({ error: 'Pedido não encontrado' });
    broadcastServerEvent('ORDER_STATUS_CHANGED', updated);
    res.json(updated);
  });

  app.put('/api/database/orders/:id', (req: Request, res: Response) => {
    const updated = db.updateOrder(String(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Pedido não encontrado' });
    broadcastServerEvent('ORDER_UPDATED', updated);
    res.json(updated);
  });

  app.delete('/api/database/orders/canceled', (req: Request, res: Response) => {
    const result = db.deleteCanceledOrders();
    broadcastServerEvent('ORDERS_CHANGED', { orders: db.getOrders() });
    res.json(result);
  });

  app.delete('/api/database/orders/:id', (req: Request, res: Response) => {
    const ok = db.deleteOrder(String(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Pedido não encontrado' });
    broadcastServerEvent('ORDERS_CHANGED', { orders: db.getOrders() });
    res.json({ success: true });
  });

  // --- DATABASE: CASH REGISTER (CAIXA / FLUXO FINANCEIRO) ---
  app.get('/api/database/cash-register', (req: Request, res: Response) => {
    res.json(db.getCashRegisterSummary());
  });

  app.post('/api/database/cash-register/finalize-order/:id', (req: Request, res: Response) => {
    const result = db.finalizeOrderAndLaunchToCashRegister(String(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: 'Pedido não encontrado para finalização' });
    broadcastServerEvent('ORDER_FINALIZED', result);
    res.json(result);
  });

  app.post('/api/database/cash-register/reopen-order/:id', (req: Request, res: Response) => {
    const reopened = db.reopenOrderFromCashRegister(String(req.params.id));
    if (!reopened) return res.status(404).json({ error: 'Pedido não encontrado' });
    broadcastServerEvent('ORDER_REOPENED', { order: reopened, summary: db.getCashRegisterSummary() });
    res.json({ success: true, order: reopened, summary: db.getCashRegisterSummary() });
  });

  app.post('/api/database/cash-register/transaction', (req: Request, res: Response) => {
    const newTx = db.addCashRegisterTransaction(req.body);
    const summary = db.getCashRegisterSummary();
    broadcastServerEvent('CASH_TRANSACTION', { transaction: newTx, summary });
    res.status(201).json({ transaction: newTx, summary });
  });

  // --- DATABASE: STORE CONFIG ---
  app.get('/api/database/config', (req: Request, res: Response) => {
    res.json(db.getConfig());
  });

  app.put('/api/database/config', (req: Request, res: Response) => {
    const updated = db.updateConfig(req.body);
    broadcastServerEvent('CONFIG_CHANGED', updated);
    res.json(updated);
  });

  // --- DATABASE: BACKUP & RESTORE ---
  app.get('/api/database/backup', (req: Request, res: Response) => {
    const backup = db.getFullBackup();
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-assados-jeferson-${dateStr}.json"`);
    res.json(backup);
  });

  app.post('/api/database/restore', (req: Request, res: Response) => {
    try {
      const result = db.restoreBackup(req.body);
      broadcastServerEvent('DATABASE_RESTORED', {
        products: db.getProducts(),
        deliveryTaxes: db.getDeliveryTaxes(),
        orders: db.getOrders(),
        config: db.getConfig()
      });
      res.json(result);
    } catch (e: any) {
      console.error('Error restoring database backup:', e);
      res.status(400).json({ error: e.message || 'Erro ao restaurar backup' });
    }
  });

  // --- RECEIPTS & TEXT FORMATTING ---
  app.get('/api/receipts/:orderId/whatsapp-text', (req: Request, res: Response) => {
    const order = db.getOrderById(String(req.params.orderId));
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    const customerText = generateWhatsAppReceiptText(order);
    const weightText = generateWeightAdjustmentWhatsAppText(order);
    const kitchenText = generateKitchenOrderText(order);
    res.json({ customerText, weightText, kitchenText, order });
  });

  // --- META WHATSAPP CLOUD API WEBHOOK ---
  // Webhook Verification GET (Meta Challenge)
  app.get('/api/whatsapp/webhook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const config = db.getConfig();
    const expectedToken = config.webhookVerifyToken || process.env.META_VERIFY_TOKEN || 'assados_jeferson_webhook_secret';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('Meta WhatsApp Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      console.warn('Meta Webhook verification failed. Received token:', token, 'Expected:', expectedToken);
      return res.status(403).json({ error: 'Verification token mismatch' });
    }
  });

  // Webhook Message Receiver POST
  app.post('/api/whatsapp/webhook', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      console.log('Received WhatsApp Webhook POST:', JSON.stringify(body, null, 2));

      // Immediate 200 OK acknowledgment to Meta
      res.status(200).send('EVENT_RECEIVED');

      // Process message in background
      if (body.object === 'whatsapp_business_account' && body.entry) {
        for (const entry of body.entry) {
          for (const change of entry.changes || []) {
            const value = change.value;
            if (value && value.messages && value.messages.length > 0) {
              const incomingMsg = value.messages[0];
              const fromPhone = incomingMsg.from; // Sender's phone number
              let textContent = '';

              if (incomingMsg.type === 'text') {
                textContent = incomingMsg.text.body;
              } else if (incomingMsg.type === 'interactive') {
                if (incomingMsg.interactive.type === 'button_reply') {
                  textContent = incomingMsg.interactive.button_reply.id || incomingMsg.interactive.button_reply.title;
                } else if (incomingMsg.interactive.type === 'list_reply') {
                  textContent = incomingMsg.interactive.list_reply.id || incomingMsg.interactive.list_reply.title;
                }
              } else if (incomingMsg.type === 'button') {
                textContent = incomingMsg.button.text;
              }

              if (textContent) {
                const sessionId = `wa_${fromPhone}`;
                const { reply, orderCreated } = await processChatMessage(sessionId, textContent, fromPhone);
                if (orderCreated) {
                  broadcastServerEvent('NEW_ORDER', orderCreated);
                }

                // If Meta credentials are provided, send reply back through Meta Cloud API
                const config = db.getConfig();
                if (config.metaAccessToken && config.metaPhoneNumberId) {
                  try {
                    await fetch(
                      `https://graph.facebook.com/v22.0/${config.metaPhoneNumberId}/messages`,
                      {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${config.metaAccessToken}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          messaging_product: 'whatsapp',
                          recipient_type: 'individual',
                          to: fromPhone,
                          type: 'text',
                          text: { body: reply.text }
                        })
                      }
                    );
                  } catch (metaErr) {
                    console.error('Failed to send message via Meta Graph API:', metaErr);
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing WhatsApp Webhook POST:', err);
    }
  });

  // Manual WhatsApp Message Sender / Dispatch Simulator
  app.post('/api/whatsapp/send-manual', async (req: Request, res: Response) => {
    const { phone, text } = req.body;
    const config = db.getConfig();

    if (!phone || !text) {
      return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
    }

    let metaResponse = null;
    let dispatchedVia = 'Simulador';

    if (config.metaAccessToken && config.metaPhoneNumberId) {
      try {
        const resp = await fetch(
          `https://graph.facebook.com/v22.0/${config.metaPhoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.metaAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: phone.replace(/\D/g, ''),
              type: 'text',
              text: { body: text }
            })
          }
        );
        metaResponse = await resp.json();
        dispatchedVia = 'Meta Cloud API Oficial';
      } catch (err: any) {
        metaResponse = { error: err.message };
      }
    }

    res.json({
      success: true,
      dispatchedVia,
      metaResponse,
      phone,
      messageSent: text,
      timestamp: new Date().toISOString()
    });
  });

  // Export full project as .ZIP
  app.get('/api/download-zip', (req: Request, res: Response) => {
    try {
      const rootDir = process.cwd();
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="assados-do-jeferson-projeto.zip"');

      archive.on('error', (err: any) => {
        console.error('Error creating project zip archive:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao gerar arquivo .zip do projeto' });
        }
      });

      archive.pipe(res);

      // Append files and directories excluding heavy build artifacts and caches
      archive.glob('**/*', {
        cwd: rootDir,
        ignore: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          '.cache/**',
          '.vite/**',
          '*.zip',
          '.env' // protect any private environment files
        ],
        dot: true
      });

      archive.finalize();
    } catch (err: any) {
      console.error('Exception in /api/download-zip:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Falha ao compactar projeto' });
      }
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('/cardapio.html', (req: Request, res: Response) => {
      const p = path.join(process.cwd(), 'dist', 'cardapio.html');
      if (fs.existsSync(p)) return res.sendFile(p);
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
    app.get('/pedido.html', (req: Request, res: Response) => {
      const p = path.join(process.cwd(), 'dist', 'pedido.html');
      if (fs.existsSync(p)) return res.sendFile(p);
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
    app.get(['/cardapio', '/pedido'], (req: Request, res: Response) => {
      const p = path.join(process.cwd(), 'dist', 'cardapio.html');
      if (fs.existsSync(p)) return res.sendFile(p);
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍖 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
