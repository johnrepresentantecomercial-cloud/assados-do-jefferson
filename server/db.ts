import fs from 'fs';
import path from 'path';
import {
  Product,
  DeliveryTax,
  Order,
  StoreConfig,
  CashTransaction,
  CashRegisterSummary,
  ChatSession,
  OrderStatus,
  FormaPagamento
} from '../src/types';

interface DatabaseSchema {
  products: Product[];
  deliveryTaxes: DeliveryTax[];
  orders: Order[];
  cashTransactions: CashTransaction[];
  config: StoreConfig;
  orderCounter: number;
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'prod_1', nome: 'Costela Bovina', categoria: 'Carne', preco: 68.00, unidade: 'kg', descricao: 'Assada lentamente por 8 horas no bafo, suculenta e macia.', destaque: true, ativo: true },
  { id: 'prod_2', nome: 'Fraldinha na Brasa', categoria: 'Carne', preco: 72.00, unidade: 'kg', descricao: 'Carne macia com capa de gordura dourada no ponto perfeito.', destaque: true, ativo: true },
  { id: 'prod_3', nome: 'Cupim Casqueirado', categoria: 'Carne', preco: 75.00, unidade: 'kg', descricao: 'Derretendo na boca, tempero especial de ervas e sal grosso.', destaque: true, ativo: true },
  { id: 'prod_4', nome: 'Frango Assado Recheado', categoria: 'Carne', preco: 45.00, unidade: 'un', descricao: 'Frango inteiro recheado com farofa úmida de bacon e miúdos.', ativo: true },
  { id: 'prod_5', nome: 'Maionese de Batatas da Casa', categoria: 'Acompanhamento', preco: 18.00, unidade: 'un', descricao: 'Receita tradicional de família com batatas e cheiro-verde (pote 500g).', ativo: true },
  { id: 'prod_6', nome: 'Farofa Especial de Bacon e Alho', categoria: 'Acompanhamento', preco: 15.00, unidade: 'un', descricao: 'Crocante, com pedacinhos de bacon defumado e manteiga (pote 350g).', ativo: true },
  { id: 'prod_7', nome: 'Salpicão de Frango Defumado', categoria: 'Acompanhamento', preco: 22.00, unidade: 'un', descricao: 'Frango desfiado, maçã, milho e batata palha artesanal (pote 500g).', ativo: true },
  { id: 'prod_8', nome: 'Coca-Cola 2 Litros', categoria: 'Bebida', preco: 14.00, unidade: 'un', descricao: 'Garrafa 2L gelada', ativo: true },
  { id: 'prod_9', nome: 'Guaraná Antarctica 2L', categoria: 'Bebida', preco: 12.00, unidade: 'un', descricao: 'Garrafa 2L gelada', ativo: true },
  { id: 'prod_10', nome: 'Cerveja Heineken Long Neck 330ml', categoria: 'Bebida', preco: 10.00, unidade: 'un', descricao: 'Long neck 330ml bem gelada', ativo: true }
];

const DEFAULT_TAXES: DeliveryTax[] = [
  { id: 'tax_1', bairro: 'Centro', taxa: 6.00, tempoMin: 20, tempoMax: 35, ativo: true },
  { id: 'tax_2', bairro: 'Jardim Alvorada', taxa: 8.00, tempoMin: 25, tempoMax: 40, ativo: true },
  { id: 'tax_3', bairro: 'Vila Operária', taxa: 7.00, tempoMin: 20, tempoMax: 35, ativo: true },
  { id: 'tax_4', bairro: 'Zona 07', taxa: 7.50, tempoMin: 25, tempoMax: 40, ativo: true },
  { id: 'tax_5', bairro: 'Parque do Ingá', taxa: 9.00, tempoMin: 30, tempoMax: 45, ativo: true },
  { id: 'tax_6', bairro: 'Jardim Aclimação', taxa: 10.00, tempoMin: 30, tempoMax: 50, ativo: true },
  { id: 'tax_7', bairro: 'Zona 02', taxa: 8.00, tempoMin: 25, tempoMax: 40, ativo: true }
];

const DEFAULT_CONFIG: StoreConfig = {
  empresa: 'Assados do Jeferson',
  telefone: '(44) 99996-1886',
  chavePix: 'assadosdojeferson@gmail.com',
  tipoPix: 'Chave E-mail',
  horarioInicio: '09:30',
  horarioFim: '14:30',
  horarioRetiradaInicio: '10:30',
  horarioRetiradaFim: '14:00',
  taxaPadrao: 8.00,
  tempoPreparo: '30 a 45 min',
  mensagemBoasVindas: 'Olá! Seja bem-vindo aos Assados do Jeferson 🍖. Como posso ajudar com seu almoço especial hoje?'
};

class Database {
  private data: DatabaseSchema;
  private sessions: Map<string, ChatSession> = new Map();

  constructor() {
    this.ensureDirectory();
    this.data = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          products: parsed.products || DEFAULT_PRODUCTS,
          deliveryTaxes: parsed.deliveryTaxes || DEFAULT_TAXES,
          orders: parsed.orders || [],
          cashTransactions: parsed.cashTransactions || [],
          config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
          orderCounter: parsed.orderCounter || 1001
        };
      }
    } catch (e) {
      console.error('Error loading database file, initializing defaults:', e);
    }

    const initialData: DatabaseSchema = {
      products: DEFAULT_PRODUCTS,
      deliveryTaxes: DEFAULT_TAXES,
      orders: [],
      cashTransactions: [],
      config: DEFAULT_CONFIG,
      orderCounter: 1001
    };

    this.saveDatabase(initialData);
    return initialData;
  }

  private saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // Products
  getProducts(): Product[] {
    return this.data.products;
  }

  addProduct(prod: Omit<Product, 'id'>): Product {
    const newProd: Product = {
      ...prod,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ativo: prod.ativo !== undefined ? prod.ativo : true
    };
    this.data.products.push(newProd);
    this.saveDatabase();
    return newProd;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = { ...this.data.products[idx], ...updates };
    this.saveDatabase();
    return this.data.products[idx];
  }

  deleteProduct(id: string): boolean {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.products.splice(idx, 1);
    this.saveDatabase();
    return true;
  }

  // Delivery Taxes
  getDeliveryTaxes(): DeliveryTax[] {
    return this.data.deliveryTaxes;
  }

  addDeliveryTax(tax: Omit<DeliveryTax, 'id'>): DeliveryTax {
    const newTax: DeliveryTax = {
      ...tax,
      id: `tax_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ativo: tax.ativo !== undefined ? tax.ativo : true
    };
    this.data.deliveryTaxes.push(newTax);
    this.saveDatabase();
    return newTax;
  }

  updateDeliveryTax(id: string, updates: Partial<DeliveryTax>): DeliveryTax | null {
    const idx = this.data.deliveryTaxes.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.data.deliveryTaxes[idx] = { ...this.data.deliveryTaxes[idx], ...updates };
    this.saveDatabase();
    return this.data.deliveryTaxes[idx];
  }

  deleteDeliveryTax(id: string): boolean {
    const idx = this.data.deliveryTaxes.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.data.deliveryTaxes.splice(idx, 1);
    this.saveDatabase();
    return true;
  }

  // Orders
  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrderById(id: string): Order | null {
    return this.data.orders.find(o => o.id === id) || null;
  }

  createOrder(orderPayload: Omit<Order, 'id' | 'numeroPedido' | 'status' | 'criadoEm'> & { status?: OrderStatus; criadoEm?: number }): Order {
    const num = `#PEDIDO-${this.data.orderCounter++}`;
    const newOrder: Order = {
      ...orderPayload,
      id: `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      numeroPedido: num,
      status: orderPayload.status || 'NOVO',
      criadoEm: orderPayload.criadoEm || Date.now(),
      carnes: orderPayload.carnes || [],
      acompanhamentos: orderPayload.acompanhamentos || [],
      bebidas: orderPayload.bebidas || []
    };

    this.data.orders.unshift(newOrder);
    this.saveDatabase();
    return newOrder;
  }

  updateOrderStatus(id: string, status: OrderStatus): Order | null {
    const order = this.data.orders.find(o => o.id === id);
    if (!order) return null;

    order.status = status;
    if (status === 'FINALIZADO' && !order.finalizadoEm) {
      order.finalizadoEm = Date.now();
    }
    this.saveDatabase();
    return order;
  }

  updateOrder(id: string, updates: Partial<Order>): Order | null {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) return null;

    this.data.orders[idx] = { ...this.data.orders[idx], ...updates };
    this.saveDatabase();
    return this.data.orders[idx];
  }

  deleteOrder(id: string): boolean {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) return false;
    this.data.orders.splice(idx, 1);
    this.saveDatabase();
    return true;
  }

  deleteCanceledOrders(): { count: number } {
    const beforeCount = this.data.orders.length;
    this.data.orders = this.data.orders.filter(o => o.status !== 'CANCELADO');
    const removedCount = beforeCount - this.data.orders.length;
    this.saveDatabase();
    return { count: removedCount };
  }

  // Cash Register
  getCashTransactions(): CashTransaction[] {
    return this.data.cashTransactions;
  }

  addCashRegisterTransaction(tx: Omit<CashTransaction, 'id' | 'dataHora' | 'criadoEm'>): CashTransaction {
    const newTx: CashTransaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      criadoEm: Date.now()
    };
    this.data.cashTransactions.unshift(newTx);
    this.saveDatabase();
    return newTx;
  }

  finalizeOrderAndLaunchToCashRegister(
    orderId: string,
    options?: { formaPagamento?: FormaPagamento; observacao?: string }
  ): { order: Order; transaction: CashTransaction; summary: CashRegisterSummary } | null {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return null;

    const finalPaymentMethod = options?.formaPagamento || order.formaPagamento || 'PIX';
    order.status = 'FINALIZADO';
    order.lancadoNoCaixa = true;
    order.finalizadoEm = Date.now();
    order.formaPagamento = finalPaymentMethod;

    const newTx: CashTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      tipo: 'ENTRADA',
      categoria: 'VENDA',
      valor: order.total,
      formaPagamento: finalPaymentMethod,
      descricao: `Venda ${order.numeroPedido} - ${order.clienteNome} (${order.tipoRecebimento})`,
      pedidoId: order.id,
      numeroPedido: order.numeroPedido,
      dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      criadoEm: Date.now()
    };

    this.data.cashTransactions.unshift(newTx);
    this.saveDatabase();

    return {
      order,
      transaction: newTx,
      summary: this.getCashRegisterSummary()
    };
  }

  reopenOrderFromCashRegister(orderId: string): Order | null {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = 'CONFIRMADO';
    order.lancadoNoCaixa = false;
    order.finalizadoEm = undefined;

    // Remove transaction associated with this order if present
    this.data.cashTransactions = this.data.cashTransactions.filter(t => t.pedidoId !== orderId);
    this.saveDatabase();

    return order;
  }

  getCashRegisterSummary(): CashRegisterSummary {
    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalPix = 0;
    let totalDinheiro = 0;
    let totalCartao = 0;

    for (const tx of this.data.cashTransactions) {
      if (tx.tipo === 'ENTRADA') {
        totalEntradas += tx.valor;
        if (tx.formaPagamento === 'PIX') totalPix += tx.valor;
        else if (tx.formaPagamento === 'Dinheiro') totalDinheiro += tx.valor;
        else if (tx.formaPagamento === 'Cartão') totalCartao += tx.valor;
      } else {
        totalSaidas += tx.valor;
        if (tx.formaPagamento === 'Dinheiro') totalDinheiro -= tx.valor;
      }
    }

    const saldoTotal = totalEntradas - totalSaidas;

    return {
      saldoTotal,
      totalEntradas,
      totalSaidas,
      totalPix,
      totalDinheiro,
      totalCartao,
      transacoes: this.data.cashTransactions
    };
  }

  // Store Config
  getConfig(): StoreConfig {
    return this.data.config;
  }

  updateConfig(updates: Partial<StoreConfig>): StoreConfig {
    this.data.config = { ...this.data.config, ...updates };
    this.saveDatabase();
    return this.data.config;
  }

  // Backup & Restore
  getFullBackup() {
    return {
      version: '1.0.0',
      appName: 'Assados do Jeferson',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      products: this.data.products,
      deliveryTaxes: this.data.deliveryTaxes,
      orders: this.data.orders,
      cashTransactions: this.data.cashTransactions,
      config: this.data.config,
      orderCounter: this.data.orderCounter
    };
  }

  restoreBackup(backupPayload: any): { success: boolean; message: string; counts: { products: number; taxes: number; orders: number; transactions: number } } {
    if (!backupPayload || typeof backupPayload !== 'object') {
      throw new Error('Formato de backup inválido: arquivo JSON vazio ou corrompido.');
    }

    // Support both direct object format and wrapped format
    const products = Array.isArray(backupPayload.products) ? backupPayload.products : this.data.products;
    const deliveryTaxes = Array.isArray(backupPayload.deliveryTaxes) ? backupPayload.deliveryTaxes : this.data.deliveryTaxes;
    const orders = Array.isArray(backupPayload.orders) ? backupPayload.orders : this.data.orders;
    const cashTransactions = Array.isArray(backupPayload.cashTransactions) ? backupPayload.cashTransactions : this.data.cashTransactions;
    const config = backupPayload.config && typeof backupPayload.config === 'object' ? { ...this.data.config, ...backupPayload.config } : this.data.config;
    const orderCounter = typeof backupPayload.orderCounter === 'number' ? backupPayload.orderCounter : this.data.orderCounter;

    this.data = {
      products,
      deliveryTaxes,
      orders,
      cashTransactions,
      config,
      orderCounter
    };

    this.saveDatabase();

    return {
      success: true,
      message: 'Backup restaurado com sucesso na base de dados.',
      counts: {
        products: this.data.products.length,
        taxes: this.data.deliveryTaxes.length,
        orders: this.data.orders.length,
        transactions: this.data.cashTransactions.length
      }
    };
  }

  // Chat Sessions
  getSession(sessionId: string): ChatSession {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        step: 'WELCOME',
        data: {},
        messages: [],
        updatedAt: Date.now()
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  saveSession(session: ChatSession) {
    session.updatedAt = Date.now();
    this.sessions.set(session.id, session);
  }

  clearSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export const db = new Database();
