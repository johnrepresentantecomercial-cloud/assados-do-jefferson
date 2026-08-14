export type ProductCategory = 'Carne' | 'Acompanhamento' | 'Bebida';

export type OrderStatus =
  | 'NOVO'
  | 'CONFIRMADO'
  | 'EM_PREPARACAO'
  | 'PRONTO'
  | 'SAIU_PARA_ENTREGA'
  | 'FINALIZADO'
  | 'CANCELADO';

export type FormaPagamento = 'PIX' | 'Dinheiro' | 'Cartão' | 'Pendente';

export type TipoRecebimento = 'Retirada' | 'Entrega';

export interface Product {
  id: string;
  nome: string;
  categoria: ProductCategory;
  preco: number;
  unidade: string;
  descricao?: string;
  ativo?: boolean;
  sabores?: string[];
  destaque?: boolean;
}

export interface DeliveryTax {
  id: string;
  bairro: string;
  taxa: number;
  tempoMin?: number;
  tempoMax?: number;
  ativo?: boolean;
}

export interface OrderItemMeat {
  produto: string;
  peso: string; // ex: "1,5 kg"
  pesoKg: number; // ex: 1.5
  precoKg: number;
  subtotal: number;
  pesoRealKg?: number;
  subtotalReal?: number;
}

export interface OrderItemUnit {
  produto: string;
  sabor?: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Order {
  id: string;
  numeroPedido: string;
  clienteNome: string;
  clienteTelefone: string;
  tipoRecebimento: TipoRecebimento;
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoBairro?: string;
  enderecoComplemento?: string;
  enderecoReferencia?: string;
  horario: string;
  carnes: OrderItemMeat[];
  acompanhamentos: OrderItemUnit[];
  bebidas: OrderItemUnit[];
  subtotal: number;
  taxaEntrega: number;
  total: number;
  formaPagamento: FormaPagamento;
  trocoPara?: number;
  observacoes?: string;
  status: OrderStatus;
  criadoEm: number;
  origem?: 'WhatsApp' | 'Web' | 'Balcao' | 'IA';
  lancadoNoCaixa?: boolean;
  finalizadoEm?: number;
  pesagemFinalizada?: boolean;
}

export interface CashTransaction {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  categoria: 'VENDA' | 'SUPRIMENTO' | 'SANGRIA' | 'DESPESA' | 'OUTROS';
  valor: number;
  formaPagamento: FormaPagamento;
  descricao: string;
  pedidoId?: string;
  numeroPedido?: string;
  dataHora: string;
  criadoEm: number;
}

export interface CashRegisterSummary {
  saldoTotal: number;
  totalEntradas: number;
  totalSaidas: number;
  totalPix: number;
  totalDinheiro: number;
  totalCartao: number;
  transacoes: CashTransaction[];
}

export interface StoreConfig {
  empresa: string;
  telefone: string;
  chavePix: string;
  tipoPix: string;
  titularPix?: string;
  horarioInicio: string;
  horarioFim: string;
  horarioRetiradaInicio: string;
  horarioRetiradaFim: string;
  taxaPadrao: number;
  tempoPreparo: string;
  mensagemBoasVindas?: string;
  metaAccessToken?: string;
  metaPhoneNumberId?: string;
  metaBusinessAccountId?: string;
  webhookVerifyToken?: string;
}

export interface ChatSession {
  id: string;
  step: 'WELCOME' | 'CHOOSE_MEAT' | 'CHOOSE_WEIGHT' | 'CHOOSE_SIDES' | 'CHOOSE_DRINKS' | 'CHOOSE_DELIVERY_TYPE' | 'ADDRESS' | 'PAYMENT' | 'SUMMARY' | 'CONFIRMED';
  data: {
    clienteNome?: string;
    clienteTelefone?: string;
    carnes?: OrderItemMeat[];
    acompanhamentos?: OrderItemUnit[];
    bebidas?: OrderItemUnit[];
    tipoRecebimento?: TipoRecebimento;
    enderecoRua?: string;
    enderecoNumero?: string;
    enderecoBairro?: string;
    enderecoComplemento?: string;
    enderecoReferencia?: string;
    horario?: string;
    formaPagamento?: FormaPagamento;
    trocoPara?: number;
    observacoes?: string;
    currentMeatDraft?: {
      nome: string;
      precoKg: number;
    };
  };
  messages: Array<{
    sender: 'user' | 'bot';
    text: string;
    timestamp: number;
  }>;
  updatedAt: number;
}
