
import { Trade, PendingOrder, OrderType, TradeType } from '../types';

// Simulation Constants
const NETWORK_LATENCY_MS = 150; // Simulate round-trip time to server
const TRADING_FEE_RATE = 0.001; // 0.1%
const ESTIMATED_SLIPPAGE = 0.0005; // 0.05%

/**
 * VIRTUAL BACKEND SERVICE
 * 
 * In a real production app, this code would live on a secure Node.js/Python server.
 * The Frontend would interact with this via REST or WebSocket API.
 * 
 * This service isolates the logic to prevent "Client-Side Trust" issues.
 */

export const ExecutionEngine = {
  
  /**
   * Simulates a secure API call to place an order.
   * Includes network latency, server-side validation, and RANDOM ERROR SIMULATION.
   */
  placeOrder: async (
    balance: number, 
    currentPrice: number,
    type: OrderType, 
    amount: number, 
    params: { price?: number, stopPrice?: number, tp?: number, sl?: number }
  ): Promise<{ success: boolean; data?: Trade | PendingOrder; error?: string; cost?: number }> => {
    
    // 1. Simulate Network Latency
    await new Promise(resolve => setTimeout(resolve, NETWORK_LATENCY_MS + Math.random() * 200));

    // --- CHAOS MONKEY SIMULATION (Error Handling Test) ---
    // 5% chance of random API failure to test frontend error handling
    if (Math.random() < 0.05) {
        const errorTypes = [
            "503 Service Unavailable",
            "API Rate Limit Exceeded",
            "Network Timeout",
            "Order Book Synchronization Error"
        ];
        return { success: false, error: errorTypes[Math.floor(Math.random() * errorTypes.length)] };
    }
    // -----------------------------------------------------

    // 2. Server-Side Validation (Security Layer)
    if (amount <= 0) return { success: false, error: "Invalid Amount" };
    
    let executionPrice = params.price || currentPrice;
    if (type === OrderType.MARKET) {
        executionPrice = currentPrice * (1 + ESTIMATED_SLIPPAGE);
    }

    const totalCost = executionPrice * amount;

    // Verify funds on "Server" (Simulated)
    if (totalCost > balance) {
        return { success: false, error: `Insufficient funds. Cost: ${totalCost.toFixed(2)}` };
    }

    // 3. Execution Logic
    if (type === OrderType.MARKET) {
        const fee = amount * TRADING_FEE_RATE;
        const netAmount = amount - fee;

        const trade: Trade = {
            id: generateId(),
            type: TradeType.BUY,
            price: executionPrice,
            amount: netAmount,
            timestamp: Date.now(),
            status: 'OPEN',
            takeProfitPrice: params.tp,
            stopLossPrice: params.sl
        };
        return { success: true, data: trade, cost: totalCost };
    } else {
        // Pending Order
        const order: PendingOrder = {
            id: generateId(),
            type: type,
            side: TradeType.BUY,
            price: params.price,
            stopPrice: params.stopPrice,
            takeProfit: params.tp,
            stopLoss: params.sl,
            amount: amount,
            timestamp: Date.now(),
            status: 'PENDING'
        };
        return { success: true, data: order };
    }
  },

  /**
   * Simulates a secure API call to close a position.
   */
  closePosition: async (
    position: Trade, 
    currentPrice: number,
    reason: string
  ): Promise<{ success: boolean; trade: Trade; netValue: number; error?: string }> => {
    
    await new Promise(resolve => setTimeout(resolve, NETWORK_LATENCY_MS));

    // Chaos Monkey for Closing
    if (Math.random() < 0.03) {
         return { success: false, trade: position, netValue: 0, error: "Execution Failed: Liquidity provider unavailable" };
    }

    const executionPrice = currentPrice * (1 - ESTIMATED_SLIPPAGE);
    const grossValue = executionPrice * position.amount;
    const fee = grossValue * TRADING_FEE_RATE;
    const netValue = grossValue - fee;
    const profit = netValue - (position.price * position.amount);

    const closedTrade: Trade = {
        ...position,
        type: TradeType.SELL,
        status: 'CLOSED',
        profit: profit,
        exitPrice: executionPrice,
        timestamp: Date.now()
    };

    return { success: true, trade: closedTrade, netValue };
  },

  /**
   * The "Matching Engine"
   */
  processPendingOrders: (
    orders: PendingOrder[], 
    currentPrice: number
  ): { filledTrade: Trade | null; remainingOrders: PendingOrder[]; triggeredInfo?: string } => {
      
      const remainingOrders: PendingOrder[] = [];
      let filledTrade: Trade | null = null;
      let triggeredInfo: string | undefined;

      for (const order of orders) {
          if (filledTrade) {
              remainingOrders.push(order);
              continue;
          }

          let shouldFill = false;
          let basePrice = currentPrice;
          let updatedOrder = { ...order };

          if (order.type === OrderType.LIMIT || order.type === OrderType.BRACKET) {
              // Buy Limit: Current Price <= Order Price
              if (order.side === TradeType.BUY && currentPrice <= (order.price || Infinity)) {
                  shouldFill = true;
                  basePrice = order.price || currentPrice;
              }
          } else if (order.type === OrderType.STOP_LIMIT) {
              // Stop logic
              if (order.status === 'PENDING' && currentPrice >= (order.stopPrice || Infinity)) {
                  updatedOrder.status = 'TRIGGERED';
                  triggeredInfo = `STOP TRIGGERED @ ${currentPrice}`;
              }
              // Limit logic after trigger
              if (updatedOrder.status === 'TRIGGERED' && currentPrice <= (order.price || Infinity)) {
                  shouldFill = true;
                  basePrice = order.price || currentPrice;
              }
          }

          if (shouldFill) {
              const effectiveAmount = order.amount * (1 - TRADING_FEE_RATE);
              filledTrade = {
                  id: generateId(),
                  type: order.side,
                  price: basePrice,
                  amount: effectiveAmount,
                  timestamp: Date.now(),
                  status: 'OPEN',
                  takeProfitPrice: order.takeProfit,
                  stopLossPrice: order.stopLoss
              };
          } else {
              remainingOrders.push(updatedOrder);
          }
      }

      return { filledTrade, remainingOrders, triggeredInfo };
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();
