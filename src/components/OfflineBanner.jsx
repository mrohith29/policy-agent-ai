import React from 'react';
import { WifiOff } from 'lucide-react';

const OfflineBanner = ({ isOffline, queueLength }) => {
  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50 flex items-center justify-center space-x-2">
      <WifiOff className="w-4 h-4" />
      <span>
        You are offline. {queueLength > 0 ? `${queueLength} message${queueLength === 1 ? '' : 's'} queued for sending.` : ''}
      </span>
    </div>
  );
};

export default OfflineBanner; 