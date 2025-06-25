import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
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

  const processOfflineMessages = useCallback(async () => {
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
  }, [isOffline]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setError(null);
      processOfflineMessages();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setError('You are offline. Some functionality may be limited.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      handleOnline();
    } else {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineMessages]);

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

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      console.warn("loadMessages called with no conversationId");
      return [];
    }
  
    try {
      if (navigator.onLine) {
        // Try to load from server first
        const { data, error } = await supabase
          .from('messages')
          .select('id, conversation_id, sender, content, created_at, content_type, context, metadata')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
  
        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }
  
        // Save to offline storage for future offline access
        await saveMessages(conversationId, data);
        return data;
      } else {
        // If offline, load directly from local storage
        const offlineMessages = await loadOfflineMessages(conversationId);
        return offlineMessages || [];
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(`Failed to load messages. Displaying offline data if available.`);
      
      // If server fails or there's any other error, fall back to offline storage
      const offlineMessages = await loadOfflineMessages(conversationId);
      return offlineMessages || [];
    }
  }, []);

  return {
    isOffline,
    queueLength,
    error,
    queueMessage,
    loadMessages,
    processOfflineMessages
  };
}; 