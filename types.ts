
export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LIMIT = 'STOP_LIMIT',
  BRACKET = 'BRACKET'
}

export interface Trade {
  id: string;
  type: TradeType;
  price: number; // Entry price
  exitPrice?: number; // Exit price for closed trades
  amount: number;
  timestamp: number;
  profit?: number; // Realized profit for sells
  status: 'OPEN' | 'CLOSED';
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

export interface PendingOrder {
  id: string;
  type: OrderType;
  side: TradeType;
  price?: number;       // Limit Price (Execution Price)
  stopPrice?: number;   // Stop Trigger Price
  takeProfit?: number;  // For Bracket
  stopLoss?: number;    // For Bracket
  amount: number;
  timestamp: number;
  status: 'PENDING' | 'TRIGGERED'; 
}

export interface MarketDataPoint {
  time: string;
  price: number;
  ma7: number; // 7-period Moving Average
  ma25: number; // 25-period Moving Average
  rsi: number; // Relative Strength Index
  volume?: number;
}

export interface Candle {
  t: number; // Open time
  o: string; // Open
  h: string; // High
  l: string; // Low
  c: string; // Close
  v: string; // Volume
  x: boolean; // Is candle closed
}

export interface BinancePayload {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: Candle; // Kline data
}

export interface AIAnalysis {
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  reasoning: string;
  insiderNote: string; // Simulated insider info
}

export interface BotConfig {
  isRunning: boolean;
  autoTrade: boolean;
  takeProfitPct: number;
  stopLossPct: number;
  useRealData: boolean;
  maxDailyLoss: number; // Max loss in USD before hard stop
  maxDrawdownPct: number; // Max equity drop percentage
}

export interface SystemStatus {
  latency: number;
  encryption: 'AES-256' | 'NONE';
  backendStatus: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'DEGRADED';
  activeNodes: number;
  lastHeartbeat: number;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}
