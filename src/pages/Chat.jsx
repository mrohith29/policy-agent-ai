import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { MoreVertical, Send, Loader2, Trash2, Pencil, WifiOff } from 'lucide-react';
import { DocumentPreview, MessageReaction, AIPersonalitySelector, CategorySelector } from '../components/ChatComponents';
import ConversationSidebar from '../components/ConversationSidebar';
import ChatHeader from '../components/ChatHeader';
import ChatMessages from '../components/ChatMessages';
import ChatInput from '../components/ChatInput';
import OfflineBanner from '../components/OfflineBanner';
import { useOffline } from '../hooks/useOffline';
import { saveMessages } from '../utils/offlineUtils';

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { question } = location.state || { question: '' };
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const messagesEndRef = useRef(null);
  const questionAddedRef = useRef(false);
  const [docText, setDocText] = useState('');
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // New state variables for chat components
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewFilename, setPreviewFilename] = useState('');
  const [showPersonalitySelector, setShowPersonalitySelector] = useState(false);
  const [currentPersonality, setCurrentPersonality] = useState('default');
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('general');
  const [messageReactions, setMessageReactions] = useState({});
  const [isSending, setIsSending] = useState(false);

  const { isOffline, queueLength, error, queueMessage, loadMessages: loadMessagesWithOffline } = useOffline(activeConversation);

  useEffect(() => {
    const checkSessionAndLoad = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }

      const user_id = session.user.id;

      try {
        const res = await fetch(`http://localhost:8000/conversations/${user_id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch conversations');
        }
        const conversations = await res.json();

        if (conversations.length > 0) {
          setHistory(conversations);
          
          const targetConvId = conversationId || conversations[0].id;
          setActiveConversation(targetConvId);
          const loadedMessages = await loadMessagesWithOffline(targetConvId);
          setMessages(loadedMessages);
          
          if (!conversationId) {
            navigate(`/chat/${targetConvId}`, { replace: true });
          }
        } else {
          const newConvRes = await fetch('http://localhost:8000/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              user_id, 
              title: 'New Conversation' 
            }),
          });
          
          if (newConvRes.ok) {
            const newConv = await newConvRes.json();
            if (newConv?.id) {
              setHistory([{ id: newConv.id, title: 'New Conversation' }]);
              setActiveConversation(newConv.id);
              navigate(`/chat/${newConv.id}`, { replace: true });
              setMessages([]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        if (!session) {
          navigate('/login', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSessionAndLoad();
  }, [navigate, conversationId]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || isSending) return;

    const newMsg = { type: 'user', content: newMessage };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setNewMessage('');
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session?.user?.id;

      if (!user_id || !activeConversation) {
        console.error("Missing user_id or activeConversation");
        return;
      }

      if (isOffline) {
        const messageData = {
          conversation_id: activeConversation,
          messages: updatedMessages,
          user_id,
          timestamp: new Date().toISOString()
        };
        
        queueMessage(messageData);
        saveMessages(activeConversation, updatedMessages);
        
        setMessages(prev => [...prev, { 
          type: 'ai', 
          content: 'Message queued for sending when back online.' 
        }]);
        return;
      }

      const res = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          conversation_id: activeConversation,
          messages: updatedMessages,
        }),
      });

      const data = await res.json();
      if (res.ok && data.answer) {
        const finalMessages = [...updatedMessages, { type: 'ai', content: data.answer }];
        setMessages(finalMessages);
        saveMessages(activeConversation, finalMessages);
      } else {
        setMessages(prev => [...prev, { type: 'ai', content: `Error: ${data.error}` }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { type: 'ai', content: 'Network error occurred.' }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewConversation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user_id = session.user.id;
  
    const title = `Conversation ${history.length + 1}`;
  
    const res = await fetch('http://localhost:8000/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, title }),
    });
  
    const newConv = await res.json();
  
    if (newConv?.id) {
      const newConversation = { id: newConv.id, title };
      setHistory(prev => [...prev, newConversation]);
      setActiveConversation(newConv.id);
      navigate(`/chat/${newConv.id}`);
      setMessages([]);
    }
  };

  const handleRename = async (convId, newTitle) => {
    if (!convId || !newTitle.trim()) return;

    try {
      const res = await fetch(`http://localhost:8000/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        throw new Error('Failed to rename conversation');
      }

      // Update the conversation in the history
      setHistory(prev => prev.map(conv => 
        conv.id === convId ? { ...conv, title: newTitle } : conv
      ));

      // If this is the active conversation, update it as well
      if (activeConversation === convId) {
        setActiveConversation(prev => ({
          ...prev,
          title: newTitle
        }));
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConversationSelect = (convId) => {
    setActiveConversation(convId);
    loadMessagesWithOffline(convId);
    navigate(`/chat/${convId}`);
  };

  // New handler functions for chat components
  const handleDocumentPreview = (content, filename) => {
    setPreviewContent(content);
    setPreviewFilename(filename);
    setShowDocumentPreview(true);
  };

  const handlePersonalitySelect = (personalityId) => {
    setCurrentPersonality(personalityId);
    setShowPersonalitySelector(false);
  };

  const handleCategorySelect = (categoryId) => {
    setCurrentCategory(categoryId);
    setShowCategorySelector(false);
  };

  const handleMessageReaction = (messageId, reactionType) => {
    setMessageReactions(prev => {
      const messageReactions = prev[messageId] || [];
      const hasReaction = messageReactions.includes(reactionType);
      
      return {
        ...prev,
        [messageId]: hasReaction
          ? messageReactions.filter(r => r !== reactionType)
          : [...messageReactions, reactionType]
      };
    });
  };

  const handleDeleteConversation = async (convId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session");
        return;
      }

      // Log the request details for debugging
      console.log('Attempting to delete conversation:', convId);
      console.log('User session:', session.user.id);

      const res = await fetch(`http://localhost:8000/conversations/${convId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'user_id': session.user.id
        }
      });

      // Log the response for debugging
      console.log('Delete response status:', res.status);
      const responseData = await res.json().catch(() => null);
      console.log('Delete response data:', responseData);

      if (res.ok) {
        // Remove the conversation from history
        setHistory(prev => prev.filter(conv => conv.id !== convId));
        
        // If the deleted conversation was active, switch to another one
        if (activeConversation === convId) {
          const remainingConversations = history.filter(conv => conv.id !== convId);
          if (remainingConversations.length > 0) {
            handleConversationSelect(remainingConversations[0].id);
          } else {
            handleNewConversation();
          }
        }
      } else {
        const errorMessage = responseData?.detail || 'Failed to delete conversation';
        console.error("Failed to delete conversation:", errorMessage);
        alert(`Failed to delete conversation: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Error during delete operation:", err);
      alert("An error occurred while deleting the conversation. Please try again.");
    }
  };

  // Add click outside handler for menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.conversation-menu')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Add scroll to bottom effect
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConversation]);

  return (
    <div className="flex h-screen bg-white">
      <ConversationSidebar
        conversations={history.map(conv => ({
          id: conv.id,
          name: conv.title
        }))}
        activeConversation={activeConversation}
        onSelectConversation={(conv) => handleConversationSelect(conv.id)}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRename}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex-1 flex flex-col">
        <ChatHeader
          currentPersonality={currentPersonality}
          currentCategory={currentCategory}
          onPersonalitySelect={handlePersonalitySelect}
          onCategorySelect={handleCategorySelect}
        />
        <OfflineBanner isOffline={isOffline} queueLength={queueLength} error={error} />
        <ChatMessages
          messages={messages}
          messageReactions={messageReactions}
          onReaction={handleMessageReaction}
          messagesEndRef={messagesEndRef}
        />
        <ChatInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          isSending={isSending}
          onDocumentParsed={setDocText}
        />
        {showDocumentPreview && (
          <DocumentPreview
            content={previewContent}
            filename={previewFilename}
            onClose={() => setShowDocumentPreview(false)}
          />
        )}
        {showPersonalitySelector && (
          <AIPersonalitySelector
            currentPersonality={currentPersonality}
            onSelect={handlePersonalitySelect}
            onClose={() => setShowPersonalitySelector(false)}
          />
        )}
        {showCategorySelector && (
          <CategorySelector
            currentCategory={currentCategory}
            onSelect={handleCategorySelect}
            onClose={() => setShowCategorySelector(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Chat;
