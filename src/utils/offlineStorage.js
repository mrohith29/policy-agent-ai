// Constants for localStorage keys
export const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'offlineQueue',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  DOCUMENTS: 'documents',
  USER_DATA: 'userData',
  SETTINGS: 'settings'
};

// Helper function to validate UUID
const isValidUUID = (uuid) => {
  if (!uuid) return false;
  try {
    const uuidStr = uuid.toString();
    // More permissive UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuidStr);
  } catch (error) {
    console.error('Error validating UUID:', error);
    return false;
  }
};

// Helper function to ensure UUID is string
const ensureUUIDString = (uuid) => {
  if (!uuid) return null;
  try {
    // If it's already a string, return it
    if (typeof uuid === 'string') {
      return uuid;
    }
    // If it's an object with toString, use that
    if (typeof uuid === 'object' && uuid !== null && 'toString' in uuid) {
      return uuid.toString();
    }
    // Otherwise, try to convert to string
    return String(uuid);
  } catch (error) {
    console.error('Error converting UUID to string:', error);
    return null;
  }
};

// Generic storage functions
export const saveToStorage = (key, data) => {
  try {
    const serializedData = JSON.stringify(data, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if ('toString' in value) {
          return value.toString();
        }
        if (Array.isArray(value)) {
          return value.map(item => {
            if (typeof item === 'object' && item !== null && 'toString' in item) {
              return item.toString();
            }
            return item;
          });
        }
      }
      return value;
    });
    localStorage.setItem(key, serializedData);
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
};

export const loadFromStorage = (key, defaultValue = []) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

// Document management
export const saveDocument = (document) => {
  try {
    const documents = loadFromStorage(STORAGE_KEYS.DOCUMENTS, []);
    const index = documents.findIndex(d => d.id === document.id);
    
    if (index >= 0) {
      documents[index] = document;
    } else {
      documents.push(document);
    }
    
    saveToStorage(STORAGE_KEYS.DOCUMENTS, documents);
    return documents;
  } catch (error) {
    console.error('Error saving document:', error);
    return [];
  }
};

export const loadDocuments = () => {
  return loadFromStorage(STORAGE_KEYS.DOCUMENTS, []);
};

export const deleteDocument = (documentId) => {
  try {
    const documents = loadFromStorage(STORAGE_KEYS.DOCUMENTS, []);
    const filteredDocuments = documents.filter(d => d.id !== documentId);
    saveToStorage(STORAGE_KEYS.DOCUMENTS, filteredDocuments);
    return filteredDocuments;
  } catch (error) {
    console.error('Error deleting document:', error);
    return [];
  }
};

// User data management
export const saveUserData = (userData) => {
  try {
    saveToStorage(STORAGE_KEYS.USER_DATA, userData);
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const loadUserData = () => {
  return loadFromStorage(STORAGE_KEYS.USER_DATA, null);
};

// Settings management
export const saveSettings = (settings) => {
  try {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const loadSettings = () => {
  return loadFromStorage(STORAGE_KEYS.SETTINGS, {
    theme: 'light',
    notifications: true,
    autoSave: true
  });
};

// Offline queue management
export const addToOfflineQueue = (action) => {
  try {
    const queue = loadFromStorage(STORAGE_KEYS.OFFLINE_QUEUE, []);
    // Ensure conversation_id is properly formatted
    if (action.data && action.data.conversation_id) {
      action.data.conversation_id = ensureUUIDString(action.data.conversation_id);
    }
    queue.push({
      ...action,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    return queue;
  } catch (error) {
    console.error('Error adding to offline queue:', error);
    return [];
  }
};

export const processOfflineQueue = async (processAction) => {
  try {
    const queue = loadFromStorage(STORAGE_KEYS.OFFLINE_QUEUE, []);
    const processedQueue = [];
    const failedQueue = [];

    for (const action of queue) {
      try {
        // Ensure conversation_id is properly formatted before processing
        if (action.data && action.data.conversation_id) {
          action.data.conversation_id = ensureUUIDString(action.data.conversation_id);
        }
        await processAction(action);
        processedQueue.push({ ...action, status: 'completed' });
      } catch (error) {
        console.error('Error processing offline action:', error);
        failedQueue.push({ ...action, status: 'failed', error: error.message });
      }
    }

    saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, failedQueue);
    return { processed: processedQueue, failed: failedQueue };
  } catch (error) {
    console.error('Error processing offline queue:', error);
    return { processed: [], failed: [] };
  }
};

// Sync status management
export const getSyncStatus = () => {
  const queue = loadFromStorage(STORAGE_KEYS.OFFLINE_QUEUE, []);
  return {
    pendingActions: queue.length,
    lastSync: loadFromStorage('lastSync', null),
    isSyncing: false
  };
};

export const updateSyncStatus = (status) => {
  saveToStorage('lastSync', new Date().toISOString());
  saveToStorage('syncStatus', status);
};

// Clear all offline data
export const clearOfflineData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('lastSync');
    localStorage.removeItem('syncStatus');
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
}; 