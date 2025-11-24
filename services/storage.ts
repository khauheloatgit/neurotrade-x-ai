
import { BotConfig, PendingOrder, Trade } from "../types";

const KEYS = {
  BALANCE: 'NT_BALANCE',
  TRADES: 'NT_TRADES',
  POSITION: 'NT_POSITION',
  ORDERS: 'NT_ORDERS',
  CONFIG: 'NT_CONFIG',
  START_OF_DAY_BALANCE: 'NT_SOD_BALANCE',
  LAST_TIMESTAMP: 'NT_LAST_TS'
};

export const StorageService = {
  saveState: (
    balance: number, 
    trades: Trade[], 
    position: Trade | null, 
    orders: PendingOrder[], 
    config: BotConfig
  ) => {
    try {
      localStorage.setItem(KEYS.BALANCE, balance.toString());
      localStorage.setItem(KEYS.TRADES, JSON.stringify(trades));
      localStorage.setItem(KEYS.POSITION, JSON.stringify(position));
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
      localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
      localStorage.setItem(KEYS.LAST_TIMESTAMP, Date.now().toString());
      
      // Initialize Start of Day Balance if not present
      if (!localStorage.getItem(KEYS.START_OF_DAY_BALANCE)) {
        localStorage.setItem(KEYS.START_OF_DAY_BALANCE, balance.toString());
      }
    } catch (e) {
      console.error("Persistence Failed:", e);
    }
  },

  loadState: () => {
    try {
      const balance = parseFloat(localStorage.getItem(KEYS.BALANCE) || '0');
      const trades = JSON.parse(localStorage.getItem(KEYS.TRADES) || '[]');
      const position = JSON.parse(localStorage.getItem(KEYS.POSITION) || 'null');
      const orders = JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
      const config = JSON.parse(localStorage.getItem(KEYS.CONFIG) || 'null');
      const sodBalance = parseFloat(localStorage.getItem(KEYS.START_OF_DAY_BALANCE) || '0');

      return {
        balance: balance > 0 ? balance : null,
        trades,
        position,
        orders,
        config,
        sodBalance: sodBalance > 0 ? sodBalance : null
      };
    } catch (e) {
      console.error("Load Failed:", e);
      return null;
    }
  },

  reset: () => {
    localStorage.clear();
    window.location.reload();
  },

  checkNewDay: (currentBalance: number) => {
    const lastTs = parseInt(localStorage.getItem(KEYS.LAST_TIMESTAMP) || '0');
    const now = new Date();
    const last = new Date(lastTs);

    // If day changed, reset Start of Day Balance
    if (now.getDate() !== last.getDate()) {
      localStorage.setItem(KEYS.START_OF_DAY_BALANCE, currentBalance.toString());
      return currentBalance;
    }
    return parseFloat(localStorage.getItem(KEYS.START_OF_DAY_BALANCE) || currentBalance.toString());
  }
};
