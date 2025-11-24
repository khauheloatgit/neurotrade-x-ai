
import React, { useRef, useEffect, useState } from 'react';
import { Trade, BotConfig, OrderType, PendingOrder, TradeType } from '../types';

interface ExecutionTerminalProps {
  balance: number;
  currentPrice: number;
  position: Trade | null;
  trades: Trade[];
  pendingOrders: PendingOrder[];
  config: BotConfig;
  tradingFeeRate: number;
  estimatedSlippage: number;
  onToggleBot: () => void;
  onPlaceOrder: (type: OrderType, amount: number, params: { price?: number, stopPrice?: number, tp?: number, sl?: number }) => void;
  onManualSell: () => void;
  onCancelOrder: (id: string) => void;
  logs: string[];
}

const ExecutionTerminal: React.FC<ExecutionTerminalProps> = ({
  balance,
  currentPrice,
  position,
  trades,
  pendingOrders,
  config,
  tradingFeeRate,
  estimatedSlippage,
  onToggleBot,
  onPlaceOrder,
  onManualSell,
  onCancelOrder,
  logs
}) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>(OrderType.MARKET);
  
  // Form State
  const [amount, setAmount] = useState<string>('');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [tpPrice, setTpPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');
  
  // Validation State
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Update defaults when switching types
  useEffect(() => {
    setInputError(null);
    if (currentPrice > 0) {
        if (!limitPrice && selectedOrderType !== OrderType.MARKET) setLimitPrice(currentPrice.toFixed(2));
        if (!stopPrice && selectedOrderType === OrderType.STOP_LIMIT) setStopPrice((currentPrice * 1.005).toFixed(2));
        
        // Auto-fill TP/SL for Bracket AND Market orders
        const isTpSlType = selectedOrderType === OrderType.BRACKET || selectedOrderType === OrderType.MARKET;
        if (!tpPrice && isTpSlType) setTpPrice((currentPrice * 1.02).toFixed(2));
        if (!slPrice && isTpSlType) setSlPrice((currentPrice * 0.98).toFixed(2));
        
        // Default to a small amount if empty
        if (!amount) setAmount((balance * 0.1 / currentPrice).toFixed(4));
    }
  }, [selectedOrderType]); 

  // Helper to set amount based on percentage of balance
  const setAmountByPercentage = (pct: number) => {
      const price = parseFloat(limitPrice) || currentPrice;
      // Buffer for fees + slippage + tiny safety margin to prevent insufficient funds
      const buffer = tradingFeeRate + estimatedSlippage + 0.002; 
      const safeBalance = balance * (1 - buffer);
      
      if (safeBalance <= 0) return;

      const newAmount = (safeBalance * pct) / price;
      setAmount(newAmount.toFixed(4));
      setInputError(null);
  };

  const handleBuy = () => {
    setInputError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        setInputError("Invalid Amount");
        return;
    }
    if (selectedOrderType !== OrderType.MARKET && (!limitPrice || parseFloat(limitPrice) <= 0)) {
        setInputError("Invalid Price");
        return;
    }

    // Determine if TP/SL are applicable
    const hasTpSl = selectedOrderType === OrderType.BRACKET || selectedOrderType === OrderType.MARKET;

    onPlaceOrder(selectedOrderType, numAmount, {
      price: selectedOrderType !== OrderType.MARKET ? parseFloat(limitPrice) : undefined,
      stopPrice: (selectedOrderType === OrderType.STOP_LIMIT) ? parseFloat(stopPrice) : undefined,
      tp: hasTpSl && tpPrice ? parseFloat(tpPrice) : undefined,
      sl: hasTpSl && slPrice ? parseFloat(slPrice) : undefined
    });
  };

  const renderInputs = () => {
      switch (selectedOrderType) {
          case OrderType.MARKET:
              return (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 mb-2">
                      <div className="text-xs text-gray-400 italic text-center border border-dashed border-gray-800 rounded bg-gray-900/50 p-2">
                          Execute immediately at best available price.
                          <div className="text-[9px] text-yellow-500 mt-1">Est. Slippage: {(estimatedSlippage * 100).toFixed(2)}%</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-green-500 font-bold tracking-wider">TAKE PROFIT (OPTIONAL)</label>
                            <input 
                                type="number" 
                                value={tpPrice} 
                                onChange={e => setTpPrice(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all"
                                placeholder="Optional"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-red-500 font-bold tracking-wider">STOP LOSS (OPTIONAL)</label>
                            <input 
                                type="number" 
                                value={slPrice} 
                                onChange={e => setSlPrice(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                placeholder="Optional"
                            />
                        </div>
                      </div>
                  </div>
              );
          case OrderType.LIMIT:
              return (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 mb-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-neon-blue font-bold tracking-wider">LIMIT PRICE (USD)</label>
                        <input 
                            type="number" 
                            value={limitPrice} 
                            onChange={e => setLimitPrice(e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all"
                            placeholder="0.00"
                        />
                    </div>
                </div>
              );
          case OrderType.STOP_LIMIT:
              return (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 mb-2">
                      <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-yellow-500 font-bold tracking-wider">STOP TRIGGER</label>
                            <input 
                                type="number" 
                                value={stopPrice} 
                                onChange={e => setStopPrice(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                            />
                         </div>
                         <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-neon-blue font-bold tracking-wider">LIMIT PRICE</label>
                            <input 
                                type="number" 
                                value={limitPrice} 
                                onChange={e => setLimitPrice(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all"
                            />
                         </div>
                      </div>
                  </div>
              );
          case OrderType.BRACKET:
              return (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 mb-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-white font-bold tracking-wider">ENTRY LIMIT PRICE</label>
                        <input 
                            type="number" 
                            value={limitPrice} 
                            onChange={e => setLimitPrice(e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-white focus:ring-1 focus:ring-white outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-green-500 font-bold tracking-wider">TAKE PROFIT</label>
                            <input 
                                type="number" 
                                value={tpPrice} 
                                onChange={e => setTpPrice(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-red-500 font-bold tracking-wider">STOP LOSS</label>
                            <input 
                                type="number" 
                                value={slPrice} 
                                onChange={e => setSlPrice(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                            />
                        </div>
                      </div>
                  </div>
              );
          default:
              return null;
      }
  };

  // Calculate Estimations
  const numAmount = parseFloat(amount) || 0;
  const execPrice = parseFloat(limitPrice) || currentPrice;
  const estRawTotal = numAmount * execPrice;
  const estFee = numAmount * tradingFeeRate;
  const estReceived = numAmount - estFee;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 p-3 rounded border border-gray-800 shadow-sm">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Account Balance</div>
            <div className="text-xl font-mono font-bold text-white tracking-tight">${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="bg-gray-900 p-3 rounded border border-gray-800 shadow-sm">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Net PnL</div>
            <div className={`text-xl font-mono font-bold tracking-tight ${trades.reduce((acc, t) => acc + (t.profit || 0), 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trades.reduce((acc, t) => acc + (t.profit || 0), 0) > 0 ? '+' : ''}
                ${trades.reduce((acc, t) => acc + (t.profit || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 flex flex-col gap-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-neon-blue opacity-50"></div>
        <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Execution Engine
            </h3>
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold ${config.isRunning ? 'text-green-500' : 'text-gray-600'}`}>
                    {config.isRunning ? 'AUTO-PILOT' : 'MANUAL ONLY'}
                </span>
                <button 
                    onClick={onToggleBot}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-900 ${config.isRunning ? 'bg-green-500 focus:ring-green-500' : 'bg-gray-700 focus:ring-gray-500'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${config.isRunning ? 'translate-x-5' : ''}`}></div>
                </button>
            </div>
        </div>

        {/* Order Type Tabs */}
        <div className="flex p-1 bg-gray-900 rounded border border-gray-800">
            {[OrderType.MARKET, OrderType.LIMIT, OrderType.STOP_LIMIT, OrderType.BRACKET].map(type => (
                <button
                    key={type}
                    onClick={() => setSelectedOrderType(type)}
                    className={`flex-1 text-[9px] md:text-[10px] font-bold py-2 rounded transition-all uppercase tracking-wider ${
                        selectedOrderType === type 
                        ? 'bg-gray-800 text-white shadow-sm border border-gray-600' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    }`}
                >
                    {type.replace('_', ' ')}
                </button>
            ))}
        </div>
        
        {/* Dynamic Order Inputs */}
        <div className={`bg-gray-900/30 rounded border p-3 flex flex-col justify-center transition-colors ${inputError ? 'border-red-500/50 bg-red-900/10' : 'border-gray-800/50'}`}>
            {/* Size Input (Common to all) */}
            <div className="mb-3 pb-3 border-b border-gray-800 border-dashed">
                <div className="flex justify-between mb-1">
                     <label className="text-[10px] text-gray-400 font-bold tracking-wider">AMOUNT (BTC)</label>
                     <span className="text-[9px] text-gray-500">Max: {(balance / currentPrice).toFixed(4)} BTC</span>
                </div>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={e => {
                            setAmount(e.target.value);
                            setInputError(null);
                        }}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all"
                        placeholder="0.00"
                    />
                </div>
                {/* Percentage Buttons */}
                <div className="flex gap-1 mt-2">
                    {[0.25, 0.5, 0.75, 1].map(pct => (
                        <button 
                            key={pct}
                            onClick={() => setAmountByPercentage(pct)}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-[9px] text-gray-400 rounded py-1 transition-colors"
                        >
                            {pct * 100}%
                        </button>
                    ))}
                </div>
            </div>

            {renderInputs()}
            
            {/* Cost Estimate */}
            <div className="flex flex-col gap-1 border-t border-gray-800 pt-2">
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                    <span>Fee ({(tradingFeeRate*100).toFixed(1)}%):</span>
                    <span>{estFee.toFixed(5)} BTC</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                    <span>Net Receive:</span>
                    <span className="text-gray-300 font-bold">{estReceived.toFixed(5)} BTC</span>
                </div>
                <div className="flex justify-between items-center text-[10px] mt-1">
                    <span className="text-gray-500">Est. Total (USDT):</span>
                    <span className="font-mono text-white font-bold">
                        ${estRawTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                </div>
            </div>
        </div>

        {inputError && (
            <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded text-center border border-red-800 animate-pulse">
                ⚠ {inputError}
            </div>
        )}

        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={handleBuy}
                disabled={!!position || !amount || parseFloat(amount) <= 0} 
                className={`py-3 border font-bold rounded shadow-[0_0_10px_rgba(0,0,0,0.3)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex flex-col items-center justify-center leading-tight
                    ${selectedOrderType === OrderType.MARKET ? 'bg-neon-green/10 border-neon-green/50 text-neon-green hover:bg-neon-green/20' : 'bg-neon-blue/10 border-neon-blue/50 text-neon-blue hover:bg-neon-blue/20'}
                `}
            >
                <span className="text-xs tracking-wider">{selectedOrderType === OrderType.MARKET ? 'MARKET BUY' : `PLACE ${selectedOrderType.replace('_', ' ')}`}</span>
            </button>
            <button 
                onClick={onManualSell}
                disabled={!position}
                className="py-3 bg-neon-red/10 border border-neon-red/50 text-neon-red font-bold rounded hover:bg-neon-red/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs tracking-wider active:scale-[0.98] shadow-[0_0_10px_rgba(0,0,0,0.3)]"
            >
                CLOSE POSITION
            </button>
        </div>
      </div>

      {/* Pending Orders List */}
      {pendingOrders.length > 0 && (
          <div className="bg-gray-950 rounded border border-gray-800 p-0 overflow-hidden flex flex-col shadow-md">
              <div className="text-[10px] text-gray-400 uppercase bg-gray-900 p-2 border-b border-gray-800 flex justify-between items-center">
                  <span className="font-bold">Open Orders</span>
                  <span className="bg-gray-800 text-gray-300 px-1.5 rounded text-[9px]">{pendingOrders.length}</span>
              </div>
              <div className="overflow-y-auto max-h-32 p-1 space-y-1 custom-scrollbar">
                  {pendingOrders.map(order => (
                      <div key={order.id} className={`flex justify-between items-center p-2 rounded border transition-colors ${order.status === 'TRIGGERED' ? 'bg-yellow-900/10 border-yellow-600/30' : 'bg-gray-900 border-gray-800'}`}>
                          <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                  <span className={`font-bold text-[10px] ${order.status === 'TRIGGERED' ? 'text-yellow-500 animate-pulse' : 'text-gray-300'}`}>
                                      {order.type.replace('_', ' ')}
                                  </span>
                                  {order.status === 'TRIGGERED' && <span className="text-[8px] bg-yellow-600 text-white px-1 rounded font-bold tracking-wider">TRIGGERED</span>}
                              </div>
                              <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                                  {order.amount.toFixed(4)} BTC @ 
                                  {order.type === OrderType.LIMIT && ` $${order.price?.toFixed(2)}`}
                                  {order.type === OrderType.STOP_LIMIT && ` Stop: $${order.stopPrice} / Lim: $${order.price}`}
                                  {order.type === OrderType.BRACKET && ` $${order.price} (TP: $${order.takeProfit})`}
                              </span>
                          </div>
                          <button 
                            onClick={() => onCancelOrder(order.id)}
                            className="text-gray-600 hover:text-red-400 px-2 py-1 text-[10px] transition-colors hover:bg-gray-800 rounded"
                            title="Cancel Order"
                          >
                              CANCEL
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Terminal Logs */}
      <div className="bg-black rounded-lg border border-gray-800 p-3 flex-1 font-mono text-xs overflow-hidden flex flex-col min-h-[150px] shadow-inner relative">
        <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-black to-transparent pointer-events-none"></div>
        <div className="text-gray-500 border-b border-gray-900 pb-1 mb-2 text-[10px] flex justify-between uppercase tracking-wider">
            <span>System Kernel Logs</span>
            <span className="text-neon-green animate-pulse">● LIVE</span>
        </div>
        <div className="overflow-y-auto flex-1 space-y-1 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #000' }}>
            {logs.map((log, i) => (
                <div key={i} className="break-words leading-tight hover:bg-gray-900/50 rounded px-1 -mx-1">
                    <span className="text-gray-600 mr-2 text-[10px]">[{new Date().toLocaleTimeString([], {hour12:false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                    <span className={
                        log.includes('PROFIT') || log.includes('SUCCESS') ? 'text-neon-green' : 
                        log.includes('ALERT') || log.includes('STOP') || log.includes('Insufficient') || log.includes('ERROR') ? 'text-yellow-500' : 
                        log.includes('CRITICAL') || log.includes('REJECTED') ? 'text-neon-red' :
                        log.includes('EXECUTING') || log.includes('FILLED') ? 'text-neon-blue' : 
                        'text-gray-400'
                    }>
                        {log}
                    </span>
                </div>
            ))}
            <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ExecutionTerminal;
