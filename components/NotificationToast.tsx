
import React, { useEffect, useState } from 'react';
import { AppNotification } from '../types';

interface NotificationToastProps {
  notifications: AppNotification[];
  onClose: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map(notif => (
        <ToastItem key={notif.id} notification={notif} onClose={onClose} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: AppNotification; onClose: (id: string) => void }> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(notification.id), 300); // Wait for animation
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  const getStyles = () => {
    switch (notification.type) {
      case 'success': return 'border-neon-green bg-gray-900 text-gray-100 shadow-[0_0_10px_rgba(0,255,157,0.2)]';
      case 'error': return 'border-neon-red bg-gray-900 text-white shadow-[0_0_10px_rgba(255,0,85,0.2)]';
      case 'warning': return 'border-yellow-500 bg-gray-900 text-gray-100 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
      default: return 'border-neon-blue bg-gray-900 text-gray-100 shadow-[0_0_10px_rgba(0,208,255,0.2)]';
    }
  };

  return (
    <div 
      className={`
        pointer-events-auto
        min-w-[300px] max-w-md
        border-l-4 rounded p-4 
        flex items-start gap-3 
        transition-all duration-300 ease-in-out
        ${getStyles()}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
       <div className="mt-0.5">
         {notification.type === 'success' && <svg className="w-4 h-4 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
         {notification.type === 'error' && <svg className="w-4 h-4 text-neon-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>}
         {notification.type === 'warning' && <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
         {notification.type === 'info' && <svg className="w-4 h-4 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
       </div>
       <div className="flex-1">
         <p className="text-xs font-bold uppercase tracking-wider mb-1">{notification.type}</p>
         <p className="text-xs font-mono text-gray-300">{notification.message}</p>
         <p className="text-[10px] text-gray-600 mt-1 text-right">{new Date(notification.timestamp).toLocaleTimeString()}</p>
       </div>
       <button onClick={() => onClose(notification.id)} className="text-gray-500 hover:text-white transition-colors">
         ✕
       </button>
    </div>
  );
};

export default NotificationToast;
