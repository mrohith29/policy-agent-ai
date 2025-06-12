// Constants for localStorage keys
export const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'offlineQueue',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations'
};

// Helper function to validate UUID
const isValidUUID = (uuid) => {
  if (!uuid) return false;
  const uuidStr = uuid.toString();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuidStr);
};

// Helper function to ensure UUID is string
const ensureUUIDString = (uuid) => {
  if (!uuid) return null;
  return uuid.toString();
};

// Save data to localStorage
export const saveToStorage = (key, data) => {
  try {
    const serializedData = JSON.stringify(data, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if ('toString' in value) {
          return value.toString();
        }
        // Handle arrays
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

// Load data from localStorage
export const loadFromStorage = (key, defaultValue = []) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    
    const parsedData = JSON.parse(data);
    
    if (Array.isArray(parsedData)) {
      return parsedData;
    } else if (typeof parsedData === 'object') {
      const validData = {};
      Object.entries(parsedData).forEach(([key, value]) => {
        if (isValidUUID(key)) {
          validData[key] = Array.isArray(value) ? value : [];
        }
      });
      return validData;
    }
    
    return defaultValue;
  } catch (error) {
    console.error(`Error loading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

// Add message to offline queue
export const addToOfflineQueue = (message) => {
  const queue = loadFromStorage(STORAGE_KEYS.OFFLINE_QUEUE);
  // Ensure message has valid UUID
  if (!message.conversationId || !isValidUUID(message.conversationId)) {
    console.error('Invalid conversation ID in message:', message);
    return queue;
  }
  queue.push(message);
  saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  return queue;
};

// Process offline queue
export const processOfflineQueue = async (processMessage) => {
  const queue = loadFromStorage(STORAGE_KEYS.OFFLINE_QUEUE);
  const processedQueue = [];
  const failedQueue = [];

  for (const message of queue) {
    try {
      if (!message.conversationId || !isValidUUID(message.conversationId)) {
        console.error('Invalid conversation ID in message:', message);
        failedQueue.push(message);
        continue;
      }
      await processMessage(message);
      processedQueue.push(message);
    } catch (error) {
      console.error('Error processing offline message:', error);
      failedQueue.push(message);
    }
  }

  // Save failed messages back to queue
  saveToStorage(STORAGE_KEYS.OFFLINE_QUEUE, failedQueue);
  return { processed: processedQueue, failed: failedQueue };
};

// Save messages for a conversation
export const saveMessages = (conversationId, messages) => {
  const convId = ensureUUIDString(conversationId);
  if (!convId || !isValidUUID(convId)) {
    console.error('Invalid conversation ID:', conversationId);
    return;
  }
  
  try {
    const allMessages = loadFromStorage(STORAGE_KEYS.MESSAGES, {});
    const messagesArray = Array.isArray(messages) ? messages : [messages];
    
    // Ensure each message has the correct format
    const formattedMessages = messagesArray.map(msg => ({
      type: msg.type || 'user',
      content: msg.content || '',
      timestamp: msg.timestamp || new Date().toISOString()
    }));
    
    allMessages[convId] = formattedMessages;
    saveToStorage(STORAGE_KEYS.MESSAGES, allMessages);
  } catch (error) {
    console.error('Error saving messages:', error);
  }
};

// Load messages for a conversation
export const loadMessages = (conversationId) => {
  const convId = ensureUUIDString(conversationId);
  if (!convId || !isValidUUID(convId)) {
    console.error('Invalid conversation ID:', conversationId);
    return [];
  }
  
  try {
    const allMessages = loadFromStorage(STORAGE_KEYS.MESSAGES, {});
    return Array.isArray(allMessages[convId]) ? allMessages[convId] : [];
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
};

// Save conversation
export const saveConversation = (conversation) => {
  const convId = ensureUUIDString(conversation?.id);
  if (!convId || !isValidUUID(convId)) {
    console.error('Invalid conversation ID:', conversation);
    return [];
  }
  
  try {
    const conversations = loadFromStorage(STORAGE_KEYS.CONVERSATIONS, []);
    const index = conversations.findIndex(c => ensureUUIDString(c.id) === convId);
    
    const formattedConversation = {
      ...conversation,
      id: convId,
      title: conversation.title || 'New Conversation',
      timestamp: conversation.timestamp || new Date().toISOString()
    };
    
    if (index >= 0) {
      conversations[index] = formattedConversation;
    } else {
      conversations.push(formattedConversation);
    }
    
    saveToStorage(STORAGE_KEYS.CONVERSATIONS, conversations);
    return conversations;
  } catch (error) {
    console.error('Error saving conversation:', error);
    return [];
  }
};

// Delete conversation
export const deleteOfflineConversation = (conversationId) => {
  const convId = ensureUUIDString(conversationId);
  if (!convId || !isValidUUID(convId)) {
    console.error('Invalid conversation ID:', conversationId);
    return [];
  }
  
  try {
    const conversations = loadFromStorage(STORAGE_KEYS.CONVERSATIONS, []);
    const filteredConversations = conversations.filter(c => ensureUUIDString(c.id) !== convId);
    saveToStorage(STORAGE_KEYS.CONVERSATIONS, filteredConversations);
    
    const allMessages = loadFromStorage(STORAGE_KEYS.MESSAGES, {});
    delete allMessages[convId];
    saveToStorage(STORAGE_KEYS.MESSAGES, allMessages);
    
    return filteredConversations;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return [];
  }
}; 