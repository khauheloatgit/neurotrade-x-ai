import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { MarketDataPoint } from '../types';

interface PriceChartProps {
  data: MarketDataPoint[];
  buyLevel?: number;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, buyLevel }) => {
  return (
    <div className="h-64 w-full bg-gray-900/50 rounded-lg border border-gray-800 p-2 backdrop-blur-sm">
      <h3 className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Real-time Market Feed (BTC/USDT)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d0ff" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#00d0ff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
          <XAxis 
            dataKey="time" 
            tick={{fill: '#718096', fontSize: 10}} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{fill: '#718096', fontSize: 10}} 
            orientation="right"
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `$${val.toFixed(0)}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f1117', borderColor: '#4a5568', color: '#fff' }}
            itemStyle={{ color: '#00d0ff' }}
            labelStyle={{ display: 'none' }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#00d0ff" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            isAnimationActive={false}
          />
          {buyLevel && (
             <ReferenceLine y={buyLevel} stroke="#00ff9d" strokeDasharray="3 3" label={{ position: 'right',  value: 'ENTRY', fill: '#00ff9d', fontSize: 10 }} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;