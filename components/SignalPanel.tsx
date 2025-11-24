import React from 'react';
import { AIAnalysis } from '../types';

interface SignalPanelProps {
  analysis: AIAnalysis | null;
  isAnalyzing: boolean;
}

const SignalPanel: React.FC<SignalPanelProps> = ({ analysis, isAnalyzing }) => {
  
  const getSignalColor = (sig: string) => {
    if (sig.includes('BUY')) return 'text-neon-green border-neon-green shadow-[0_0_15px_rgba(0,255,157,0.3)]';
    if (sig.includes('SELL')) return 'text-neon-red border-neon-red shadow-[0_0_15px_rgba(255,0,85,0.3)]';
    return 'text-gray-400 border-gray-600';
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50"></div>
      
        <div className="flex justify-between items-start mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-yellow-400 animate-ping' : 'bg-green-500'}`}></span>
                Neural Engine v9.2
            </h2>
            <span className="text-xs text-gray-500 font-mono">Latency: 12ms</span>
        </div>

        {analysis ? (
        <div className="space-y-6">
            <div className="text-center">
                <div className="text-xs text-gray-500 mb-1 uppercase">Generated Signal</div>
                <div className={`text-3xl font-black border-2 rounded p-2 inline-block w-full bg-gray-950 transition-all duration-300 ${getSignalColor(analysis.signal)}`}>
                    {analysis.signal}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950 p-3 rounded border border-gray-800">
                    <div className="text-xs text-gray-500 mb-1">Confidence</div>
                    <div className="text-xl font-mono text-neon-blue">{analysis.confidence}%</div>
                    <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                        <div className="bg-neon-blue h-full transition-all duration-500" style={{ width: `${analysis.confidence}%` }}></div>
                    </div>
                </div>
                <div className="bg-gray-950 p-3 rounded border border-gray-800">
                    <div className="text-xs text-gray-500 mb-1">Success Prob.</div>
                    <div className="text-xl font-mono text-purple-400">98.2%</div>
                    <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                        <div className="bg-purple-400 h-full" style={{ width: '98.2%' }}></div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="p-2 bg-gray-950/50 border-l-2 border-neon-blue text-xs text-gray-300 font-mono">
                    <span className="text-neon-blue font-bold">ANALYSIS&gt;</span> {analysis.reasoning}
                </div>
                <div className="p-2 bg-gray-950/50 border-l-2 border-purple-500 text-xs text-gray-300 font-mono">
                    <span className="text-purple-500 font-bold">INSIDER&gt;</span> {analysis.insiderNote}
                </div>
            </div>
        </div>
        ) : (
            <div className="h-48 flex items-center justify-center flex-col text-gray-600 animate-pulse">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                <span className="text-xs font-mono">Initializing Neural Core...</span>
            </div>
        )}
    </div>
  );
};

export default SignalPanel;