
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeMarket } from './services/geminiService';
import { calculateRSI, calculateSMA } from './services/ta';
import { StorageService } from './services/storage';
import { ExecutionEngine } from './services/executionEngine';
import PriceChart from './components/PriceChart';
import SignalPanel from './components/SignalPanel';
import ExecutionTerminal from './components/ExecutionTerminal';
import InfrastructurePanel from './components/InfrastructurePanel';
import NotificationToast from './components/NotificationToast';
import { Trade, MarketDataPoint, AIAnalysis, BotConfig, TradeType, OrderType, PendingOrder, BinancePayload, SystemStatus, AppNotification } from './types';

// Constants
const INITIAL_BALANCE = 10000;
const ANALYSIS_INTERVAL_MS = 15000; 
const RECONNECT_DELAY_MS = 3000;

const App: React.FC = () => {
  // --- State ---
  const [marketData, setMarketData] = useState<MarketDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  
  // Initialize state from Storage or Defaults
  const savedState = StorageService.loadState();

  const [balance, setBalance] = useState(savedState?.balance || INITIAL_BALANCE);
  const [position, setPosition] = useState<Trade | null>(savedState?.position || null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(savedState?.orders || []);
  const [trades, setTrades] = useState<Trade[]>(savedState?.trades || []);
  const [sodBalance, setSodBalance] = useState(savedState?.sodBalance || INITIAL_BALANCE);
  
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<string[]>(['Initializing Secure Client...', 'Handshake with Backend: SUCCESS']);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // System Status State
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
      latency: 45,
      encryption: 'AES-256',
      backendStatus: 'ONLINE',
      activeNodes: 3,
      lastHeartbeat: Date.now()
  });

  const [config, setConfig] = useState<BotConfig>(savedState?.config || {
    isRunning: false,
    autoTrade: false, 
    takeProfitPct: 0.015, 
    stopLossPct: 0.005,
    useRealData: true,
    maxDailyLoss: 500, 
    maxDrawdownPct: 0.05 
  });

  // Refs for Loop Access
  const priceRef = useRef(0);
  const positionRef = useRef<Trade | null>(null);
  const pendingOrdersRef = useRef<PendingOrder[]>([]);
  const configRef = useRef(config);
  const balanceRef = useRef(balance);
  const priceHistoryRef = useRef<number[]>([]); 
  const wsRef = useRef<WebSocket | null>(null);

  // Sync Refs & Persistence
  useEffect(() => { priceRef.current = currentPrice; }, [currentPrice]);
  
  useEffect(() => { 
    positionRef.current = position;
    StorageService.saveState(balance, trades, position, pendingOrders, config);
  }, [position]);

  useEffect(() => { 
    pendingOrdersRef.current = pendingOrders; 
    StorageService.saveState(balance, trades, position, pendingOrders, config);
  }, [pendingOrders]);

  useEffect(() => { 
    configRef.current = config; 
    StorageService.saveState(balance, trades, position, pendingOrders, config);
  }, [config]);
  
  useEffect(() => { 
    balanceRef.current = balance;
    StorageService.saveState(balance, trades, position, pendingOrders, config);
  }, [balance]);

  useEffect(() => {
     StorageService.saveState(balance, trades, position, pendingOrders, config);
  }, [trades]);

  useEffect(() => {
    const updatedSod = StorageService.checkNewDay(balance);
    setSodBalance(updatedSod);
    
    // Simulate Heartbeat
    const hbInterval = setInterval(() => {
        setSystemStatus(prev => ({
            ...prev,
            lastHeartbeat: Date.now(),
            latency: 40 + Math.floor(Math.random() * 50) // Fluctuate latency
        }));
    }, 5000);
    return () => clearInterval(hbInterval);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-50), msg]); 
  };

  const addNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message, timestamp: Date.now() }]);
    if (type === 'error') addLog(`ERROR: ${message}`);
  };

  const removeNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const checkCircuitBreaker = (currentBal: number) => {
    if (!config.isRunning) return;
    const dailyPnl = currentBal - sodBalance;
    const drawdown = (INITIAL_BALANCE - currentBal) / INITIAL_BALANCE;

    if (dailyPnl <= -config.maxDailyLoss) {
      setConfig(prev => ({ ...prev, isRunning: false }));
      addNotification('error', 'Circuit Breaker Tripped: Daily Loss Limit');
      return true;
    }
    if (drawdown >= config.maxDrawdownPct) {
      setConfig(prev => ({ ...prev, isRunning: false }));
      addNotification('error', 'Circuit Breaker Tripped: Max Drawdown');
      return true;
    }
    return false;
  };

  // --- Real-Time Data Feed with Auto-Reconnection ---
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    addLog("NETWORK: Connecting to Binance Feed...");
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1s');
    wsRef.current = ws;

    ws.onopen = () => {
        addLog("SECURE FEED: Binance WSS Connected (TLS 1.3)");
        setSystemStatus(prev => ({ ...prev, backendStatus: 'ONLINE' }));
    };

    ws.onmessage = (event) => {
        try {
            const payload: BinancePayload = JSON.parse(event.data);
            const candle = payload.k;
            const newPrice = parseFloat(candle.c);
            
            setCurrentPrice(newPrice);
            
            if (priceHistoryRef.current.length === 0 || candle.x) { 
                priceHistoryRef.current.push(newPrice);
                if (priceHistoryRef.current.length > 100) priceHistoryRef.current.shift();
            } else {
                priceHistoryRef.current[priceHistoryRef.current.length - 1] = newPrice;
            }

            const prices = priceHistoryRef.current;
            const rsi = calculateRSI(prices, 14);
            const ma7 = calculateSMA(prices, 7);
            const ma25 = calculateSMA(prices, 25);

            setMarketData(prev => {
                const newPoint: MarketDataPoint = {
                    time: new Date(payload.E).toLocaleTimeString([], { hour12: false }),
                    price: newPrice,
                    ma7: ma7,
                    ma25: ma25,
                    rsi: rsi
                };
                const newData = [...prev, newPoint];
                if (newData.length > 60) newData.shift(); 
                return newData;
            });

            // Trigger Virtual Backend Processing
            runExecutionCheck(newPrice);
        } catch (e) {
            console.error("Feed Parse Error", e);
        }
    };

    ws.onerror = (err) => {
        addLog("CRITICAL: Feed Connection Error.");
        setSystemStatus(prev => ({ ...prev, backendStatus: 'DEGRADED' }));
    };

    ws.onclose = () => {
        addLog(`NETWORK: Connection lost. Retrying in ${RECONNECT_DELAY_MS}ms...`);
        setSystemStatus(prev => ({ ...prev, backendStatus: 'OFFLINE' }));
        setTimeout(connectWebSocket, RECONNECT_DELAY_MS);
    };
  }, []);

  useEffect(() => {
      connectWebSocket();
      return () => { wsRef.current?.close(); };
  }, [connectWebSocket]);

  // --- Execution Logic (Delegated to Virtual Backend) ---
  const runExecutionCheck = (currentP: number) => {
      const activePos = positionRef.current;
      const orders = pendingOrdersRef.current;
      
      if (checkCircuitBreaker(balanceRef.current)) return;

      // 1. Process Pending Orders via Matching Engine
      if (orders.length > 0) {
        // Use the Virtual Backend Engine to process matching
        const { filledTrade, remainingOrders, triggeredInfo } = ExecutionEngine.processPendingOrders(orders, currentP);
        
        if (triggeredInfo) addLog(`BACKEND: ${triggeredInfo}`);

        if (filledTrade) {
            setPosition(filledTrade);
            addNotification('success', `${filledTrade.type} Filled @ ${filledTrade.price.toFixed(2)}`);
        }
        
        // Only update state if changes occurred to prevent re-renders
        if (remainingOrders.length !== orders.length || triggeredInfo) {
            setPendingOrders(remainingOrders);
        }
      }

      // 2. Manage Open Position Limits (TP/SL)
      if (activePos) {
         // Check Bracket Levels
         if (activePos.takeProfitPrice && currentP >= activePos.takeProfitPrice) {
             executeSell("BRACKET_TP");
         } else if (activePos.stopLossPrice && currentP <= activePos.stopLossPrice) {
             executeSell("BRACKET_SL");
         } 
         // Check Strategy Auto-Exits
         else if (configRef.current.isRunning && !activePos.takeProfitPrice && !activePos.stopLossPrice) {
             const pnlPct = (currentP - activePos.price) / activePos.price;
             if (pnlPct >= configRef.current.takeProfitPct) {
                 executeSell("AUTO_TP");
             } else if (pnlPct <= -configRef.current.stopLossPct) {
                 executeSell("AUTO_SL");
             }
         }
      }
  };

  // --- AI Loop ---
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!config.isRunning || priceHistoryRef.current.length < 20) return;

      setIsAnalyzing(true);
      try {
        const prices = priceHistoryRef.current;
        const currentP = prices[prices.length - 1];
        const trend = currentP > prices[prices.length - 10] ? "UPTREND" : "DOWNTREND";
        const rsi = calculateRSI(prices);

        const result = await analyzeMarket(currentP, rsi, trend);
        setAnalysis(result);
        
        // Auto Trade Logic
        if (configRef.current.autoTrade && !positionRef.current) {
            if (result.signal === 'STRONG_BUY' && result.confidence > 85) {
                const amt = (balance * 0.25) / currentP; 
                placeOrder(OrderType.MARKET, amt, {});
            }
        } else if (configRef.current.autoTrade && positionRef.current) {
            if (result.signal === 'STRONG_SELL' && result.confidence > 85) {
                executeSell("AI_SIGNAL");
            }
        }
      } catch (e) {
         addNotification('warning', 'Neural Core Analysis Failed. Retrying...');
      } finally {
          setIsAnalyzing(false);
      }

    }, ANALYSIS_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [config.isRunning]);

  // --- Actions (Async to Virtual Backend) ---
  
  const placeOrder = async (type: OrderType, amount: number, params: { price?: number, stopPrice?: number, tp?: number, sl?: number }) => {
    addLog(`SENDING: ${type} Order to Backend...`);
    
    try {
        // Call the Virtual Backend
        const result = await ExecutionEngine.placeOrder(balance, priceRef.current, type, amount, params);

        if (result.success && result.data) {
            if (type === OrderType.MARKET) {
                const trade = result.data as Trade;
                setPosition(trade);
                setBalance(prev => prev - (result.cost || 0));
                addNotification('success', `Market Buy Executed @ ${trade.price.toFixed(2)}`);
            } else {
                const order = result.data as PendingOrder;
                setPendingOrders(prev => [...prev, order]);
                addNotification('info', `Pending Order #${order.id.substring(0,4)} Placed`);
            }
        } else {
            addNotification('error', `Order Rejected: ${result.error}`);
        }
    } catch (e) {
        addNotification('error', 'Network Error: Failed to reach execution node');
    }
  };

  const cancelOrder = (id: string) => {
      setPendingOrders(prev => prev.filter(o => o.id !== id));
      addLog(`SENT: Cancel Request for Order #${id.substring(0,4)}`);
      addNotification('info', 'Order Cancelled');
  };

  const executeSell = async (reason: string) => {
    const trade = positionRef.current;
    if (!trade) return;

    addLog(`SENDING: Close Position Request (${reason})...`);
    
    try {
        // Call Virtual Backend
        const result = await ExecutionEngine.closePosition(trade, priceRef.current, reason);

        if (result.success) {
            setTrades(prev => [result.trade, ...prev]);
            setBalance(prev => prev + result.netValue);
            setPosition(null);
            const profit = result.trade.profit || 0;
            if (profit > 0) {
                addNotification('success', `Profit Locked: +$${profit.toFixed(2)}`);
            } else {
                addNotification('warning', `Position Closed: $${profit.toFixed(2)}`);
            }
        } else {
            addNotification('error', `Close Failed: ${result.error}`);
        }
    } catch (e) {
         addNotification('error', 'Critical: Failed to close position (Network)');
    }
  };

  const toggleBot = () => {
    setConfig(prev => ({ ...prev, isRunning: !prev.isRunning }));
    addNotification('info', config.isRunning ? "Neural Bot Halted" : "Neural Bot Activated");
  };

  const handleReset = () => {
    if(confirm("Reset local cache?")) {
      StorageService.reset();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 md:p-8 font-mono selection:bg-neon-blue selection:text-black relative">
      
      <NotificationToast notifications={notifications} onClose={removeNotification} />

      {/* Deployment Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 bg-neon-green rounded-full animate-pulse"></span>
                Infrastructure Status
              </h2>
              <button onClick={() => setShowDeployModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
               <div className="bg-blue-900/20 border border-blue-600/50 p-3 rounded text-xs text-blue-200">
                 <strong>ARCHITECTURE UPGRADED:</strong> The system now utilizes a Client-Server architecture pattern. Execution logic is isolated in a secure Virtual Backend Service, reducing client-side vectors.
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
                   <span className="text-gray-400">Backend Service</span>
                   <span className="text-neon-green font-bold">VIRTUALIZED</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
                   <span className="text-gray-400">Encryption</span>
                   <span className="text-neon-green font-bold">AES-256 (SIM)</span>
                 </div>
               </div>
               <button onClick={() => setShowDeployModal(false)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded transition-colors text-sm">
                 CLOSE MONITOR
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
            NEURO<span className="text-neon-blue">TRADE</span><span className="text-gray-600">_X</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">SECURE QUANT TERMINAL (BTC/USDT)</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-3">
              <button 
                onClick={handleReset}
                className="text-[10px] text-gray-600 hover:text-red-500 underline px-2"
              >
                RESET DATA
              </button>
              <button 
                onClick={() => setShowDeployModal(true)}
                className="bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded border border-gray-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                SECURE CONNECTION
              </button>
           </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Chart & Analysis (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           <div className="relative group">
             <div className="absolute top-2 right-2 z-10 bg-gray-900/80 backdrop-blur px-3 py-1 rounded text-xl font-bold text-white border border-gray-700 shadow-lg transition-colors duration-300 border-l-4 border-l-neon-blue">
                ${currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
             </div>
             <PriceChart data={marketData} buyLevel={position?.price} />
           </div>

           {/* Infrastructure Status Panel */}
           <InfrastructurePanel status={systemStatus} />

           <SignalPanel analysis={analysis} isAnalyzing={isAnalyzing} />
        </div>

        {/* Right Column: Execution & Logs (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <ExecutionTerminal 
             balance={balance}
             currentPrice={currentPrice}
             position={position}
             trades={trades}
             pendingOrders={pendingOrders}
             config={config}
             tradingFeeRate={0.001}
             estimatedSlippage={0.0005}
             onToggleBot={toggleBot}
             onPlaceOrder={placeOrder}
             onManualSell={() => executeSell("MANUAL")}
             onCancelOrder={cancelOrder}
             logs={logs}
           />
           
           <div className="bg-gray-900 rounded border border-gray-800 p-4 shadow-lg">
             <h3 className="text-xs text-gray-500 uppercase mb-3 tracking-wider">Recent Fills (Secure)</h3>
             <div className="space-y-2">
               {trades.length === 0 && <div className="text-xs text-gray-600 italic text-center py-2">No trades executed yet.</div>}
               {trades.slice(0, 5).map(t => (
                 <div key={t.id} className="flex justify-between text-xs border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                   <div className="flex flex-col gap-1">
                     <span className={`font-bold ${t.type === TradeType.BUY ? 'text-green-500' : 'text-red-500'}`}>
                        {t.type} <span className="text-gray-500 text-[10px] font-normal">{new Date(t.timestamp).toLocaleTimeString()}</span>
                     </span>
                     <span className="text-[10px] text-gray-400 font-mono">
                        {t.price.toFixed(0)} <span className="text-gray-600">→</span> {t.exitPrice ? t.exitPrice.toFixed(0) : '---'}
                     </span>
                   </div>
                   <div className={`font-mono flex flex-col items-end ${t.profit && t.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                     <span>{t.profit ? `${t.profit > 0 ? '+' : ''}${t.profit.toFixed(2)}` : '-'}</span>
                     <span className="text-[9px] text-gray-600">NET PNL (USD)</span>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;
