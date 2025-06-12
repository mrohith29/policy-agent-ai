import { useState, useEffect } from 'react';
import {
  addToOfflineQueue,
  processOfflineQueue,
  getSyncStatus,
  updateSyncStatus,
  loadFromStorage,
  STORAGE_KEYS
} from '../utils/offlineStorage';

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to ensure UUID is string
const ensureUUIDString = (uuid) => {
  if (!uuid) return null;
  try {
    if (typeof uuid === 'string') return uuid;
    if (typeof uuid === 'object' && uuid !== null && 'toString' in uuid) {
      return uuid.toString();
    }
    return String(uuid);
  } catch (error) {
    console.error('Error converting UUID to string:', error);
    return null;
  }
};

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError(null);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setError('You are offline. Changes will be synced when you are back online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (isOnline) {
      syncOfflineData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  const syncOfflineData = async () => {
    if (!isOnline) return;

    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      
      const processAction = async (action) => {
        const { type, data } = action;
        
        // Ensure conversation_id is properly formatted
        if (data && data.conversation_id) {
          data.conversation_id = ensureUUIDString(data.conversation_id);
        }

        switch (type) {
          case 'CREATE_CONVERSATION':
            await fetch(`${API_BASE_URL}/conversations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            break;

          case 'SEND_MESSAGE':
            await fetch(`${API_BASE_URL}/conversations/${data.conversation_id}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            break;

          case 'UPLOAD_DOCUMENT':
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('conversation_id', data.conversation_id);
            await fetch(`${API_BASE_URL}/documents`, {
              method: 'POST',
              body: formData
            });
            break;

          case 'UPDATE_SETTINGS':
            await fetch(`${API_BASE_URL}/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            break;

          case 'UPDATE_USER_DATA':
            await fetch(`${API_BASE_URL}/user`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            break;

          default:
            throw new Error(`Unknown action type: ${type}`);
        }
      };

      const { processed, failed } = await processOfflineQueue(processAction);
      
      updateSyncStatus({
        lastSync: new Date().toISOString(),
        processed: processed.length,
        failed: failed.length
      });

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        pendingActions: failed.length,
        lastSync: new Date().toISOString()
      }));

      if (failed.length > 0) {
        setError(`${failed.length} action(s) failed to sync. They will be retried when you are back online.`);
      }
    } catch (error) {
      console.error('Error syncing offline data:', error);
      setError('Error syncing offline data. Please try again.');
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const queueAction = async (type, data) => {
    try {
      // Ensure conversation_id is properly formatted
      if (data && data.conversation_id) {
        data.conversation_id = ensureUUIDString(data.conversation_id);
      }

      if (isOnline) {
        // Process immediately if online
        await syncOfflineData();
      } else {
        // Queue for later if offline
        addToOfflineQueue({ type, data });
        setSyncStatus(prev => ({
          ...prev,
          pendingActions: prev.pendingActions + 1
        }));
      }
    } catch (error) {
      console.error('Error queueing action:', error);
      setError(error.message);
    }
  };

  return {
    isOnline,
    syncStatus,
    error,
    queueAction,
    syncOfflineData
  };
}; 