import { useState, useEffect } from 'react';
import { 
  addToOfflineQueue, 
  processOfflineQueue, 
  saveMessages, 
  loadMessages as loadOfflineMessages 
} from '../utils/offlineUtils';

const isValidUUID = (uuid) => {
  if (!uuid) return false;
  const uuidStr = uuid.toString();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuidStr);
};

const ensureUUIDString = (uuid) => {
  if (!uuid) return null;
  return uuid.toString();
};

export const useOffline = (activeConversation) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setError(null);
      processOfflineMessages();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setError('You are offline. Messages will be queued for sending when you are back online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeConversation]);

  const processOfflineMessages = async () => {
    if (!isOffline) {
      try {
        const { processed, failed } = await processOfflineQueue(async (message) => {
          const convId = ensureUUIDString(message.conversation_id);
          if (!convId || !isValidUUID(convId)) {
            throw new Error('Invalid conversation ID format');
          }

          const res = await fetch('http://localhost:8000/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: ensureUUIDString(message.user_id),
              conversation_id: convId,
              messages: message.messages,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Failed to process offline message');
          }

          const data = await res.json();
          if (data.answer) {
            const finalMessages = [
              ...message.messages,
              {
                type: 'ai',
                content: data.answer,
                timestamp: new Date().toISOString()
              }
            ];
            saveMessages(convId, finalMessages);
            return finalMessages;
          }
        });

        console.log(`Processed ${processed.length} messages, ${failed.length} failed`);
        setQueueLength(failed.length);
        
        if (failed.length > 0) {
          setError(`${failed.length} message(s) failed to send. They will be retried when you are back online.`);
        }
      } catch (error) {
        console.error('Error processing offline messages:', error);
        setError('Error processing offline messages. Please try again.');
      }
    }
  };

  const queueMessage = (messageData) => {
    const convId = ensureUUIDString(messageData.conversation_id);
    if (!convId || !isValidUUID(convId)) {
      setError('Invalid conversation ID format');
      return;
    }

    const formattedMessage = {
      ...messageData,
      conversation_id: convId,
      user_id: ensureUUIDString(messageData.user_id),
      timestamp: new Date().toISOString()
    };

    addToOfflineQueue(formattedMessage);
    setQueueLength(prev => prev + 1);
  };

  const loadMessages = async (conversationId) => {
    const convId = ensureUUIDString(conversationId);
    if (!convId || !isValidUUID(convId)) {
      setError('Invalid conversation ID format');
      return [];
    }

    try {
      // Try to load from server first
      const res = await fetch(`http://localhost:8000/messages/${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format from server');
        }
        
        const formatted = data.map(msg => ({
          type: msg.sender === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString()
        }));
        
        // Save to offline storage
        saveMessages(convId, formatted);
        return formatted;
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages from server:', error);
      setError('Error loading messages. Loading from offline storage...');
      
      // If server fails or network error, try to load from offline storage
      const offlineMessages = loadOfflineMessages(convId);
      if (!Array.isArray(offlineMessages)) {
        console.error('Invalid offline messages format:', offlineMessages);
        return [];
      }
      return offlineMessages;
    }
  };

  return {
    isOffline,
    queueLength,
    error,
    queueMessage,
    loadMessages,
    processOfflineMessages
  };
}; 