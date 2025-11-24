
import React, { useEffect, useState } from 'react';
import { SystemStatus } from '../types';

interface InfrastructurePanelProps {
  status: SystemStatus;
}

const InfrastructurePanel: React.FC<InfrastructurePanelProps> = ({ status }) => {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setBlink(b => !b), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-950 rounded-lg border border-gray-800 p-4 shadow-lg overflow-hidden relative">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,22,33,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,22,33,0)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none"></div>

      <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <svg className="w-3 h-3 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          Secure Infrastructure
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-[9px] text-gray-500">UPTIME</span>
           <span className="text-[9px] text-green-500 font-mono">99.99%</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Node Status */}
        <div className="flex flex-col">
           <span className="text-[9px] text-gray-500 mb-1">BACKEND NODES</span>
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${status.backendStatus === 'ONLINE' ? 'bg-neon-green' : 'bg-red-500'} ${blink ? 'opacity-100' : 'opacity-50'}`}></div>
             <span className="text-xs text-gray-200 font-mono font-bold">{status.backendStatus} ({status.activeNodes})</span>
           </div>
        </div>

        {/* Encryption */}
        <div className="flex flex-col border-l border-gray-800 pl-4">
           <span className="text-[9px] text-gray-500 mb-1">ENCRYPTION</span>
           <div className="flex items-center gap-2">
             <svg className="w-3 h-3 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
             <span className="text-xs text-neon-blue font-mono font-bold">{status.encryption}</span>
           </div>
        </div>

        {/* Latency */}
        <div className="flex flex-col border-l border-gray-800 pl-4">
           <span className="text-[9px] text-gray-500 mb-1">NETWORK LATENCY</span>
           <div className="flex items-center gap-2">
             <span className={`text-xs font-mono font-bold ${status.latency < 100 ? 'text-green-500' : 'text-yellow-500'}`}>
               {status.latency}ms
             </span>
           </div>
        </div>

        {/* Execution Layer */}
        <div className="flex flex-col border-l border-gray-800 pl-4">
           <span className="text-[9px] text-gray-500 mb-1">EXECUTION CORE</span>
           <div className="flex items-center gap-2">
             <span className="text-xs text-purple-400 font-mono font-bold">VERIFIED</span>
           </div>
        </div>
      </div>
      
      {/* Logs Teletype */}
      <div className="mt-3 pt-2 border-t border-gray-900 text-[9px] font-mono text-gray-600 flex justify-between">
         <span>ID: 8f-2a-9x-Secure_Enclave</span>
         <span>Last Heartbeat: {new Date(status.lastHeartbeat).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default InfrastructurePanel;
