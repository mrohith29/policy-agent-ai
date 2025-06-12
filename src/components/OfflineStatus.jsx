import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const OfflineStatus = ({ isOnline, syncStatus, error, onSync }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center space-x-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isOnline ? 'You are online' : 'You are offline'}
            </p>
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
            {syncStatus.pendingActions > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {syncStatus.pendingActions} action(s) pending sync
              </p>
            )}
            {syncStatus.lastSync && (
              <p className="text-xs text-gray-500 mt-1">
                Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
              </p>
            )}
          </div>
          {!isOnline && syncStatus.pendingActions > 0 && (
            <button
              onClick={onSync}
              disabled={syncStatus.isSyncing}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Sync pending changes"
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-500 ${
                  syncStatus.isSyncing ? 'animate-spin' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineStatus; 