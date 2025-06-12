import React from 'react';
import { WifiOff } from 'lucide-react';

const OfflineIndicator = ({ isOffline, queueLength }) => {
  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
      <WifiOff size={20} className="animate-pulse" />
      <div>
        <p className="font-medium">You're offline</p>
        {queueLength > 0 && (
          <p className="text-sm opacity-90">
            {queueLength} {queueLength === 1 ? 'action' : 'actions'} pending sync
          </p>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator; 