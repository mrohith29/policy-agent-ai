import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { MoreVertical, Send, Loader2, Trash2, Pencil, WifiOff } from 'lucide-react';
import { DocumentPreview, MessageReaction, AIPersonalitySelector, CategorySelector } from '../components/ChatComponents';
import ConversationSidebar from '../components/ConversationSidebar';
import ChatHeader from '../components/ChatHeader';
import ChatMessages from '../components/ChatMessages';
import ChatInput from '../components/ChatInput';
import OfflineBanner from '../components/OfflineBanner';
import Button from '../components/Button';
import { useOffline } from '../hooks/useOffline';
import { saveMessages } from '../utils/offlineUtils';
import { useNotification } from '../contexts/NotificationContext';
import { UserContext } from '../contexts/UserContext';

const FREE_USER_CONVERSATION_LIMIT = 1;
const FREE_USER_AI_MESSAGE_LIMIT = 10;

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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState(false);

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MESSAGES_PER_PAGE = 20;

  const { showSuccess, showError, showInfo } = useNotification();
  const { userProfile, userLoading, isPremium } = useContext(UserContext);
  const { isOffline, queueLength, error, queueMessage, loadMessages: loadMessagesWithOffline } = useOffline(activeConversation);

  const handleConversationSelect = useCallback(async (conversation) => {
    if (!conversation || !conversation.id) {
      showError('Invalid conversation selected');
      return;
    }
    
    setIsLoadingMessages(true);
    setActiveConversation(conversation.id);
    setIsNewConversation(false);
    navigate(`/chat/${conversation.id}`);
    const loadedMessages = await loadMessagesWithOffline(conversation.id);
    setMessages(loadedMessages);
    setIsLoadingMessages(false);
  }, [navigate, loadMessagesWithOffline, showError, setMessages]);

  useEffect(() => {
    const checkSessionAndLoad = async () => {
      if (userLoading) return;
      if (!userProfile) {
        navigate('/login', { replace: true });
        return;
      }

      const user_id = userProfile.id;

      try {
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('id, title, created_at, updated_at, summary, metadata')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;

        if (conversations && conversations.length > 0) {
          setHistory(conversations);
          
          const targetConvId = conversationId || conversations[0].id;
          
          if (targetConvId && targetConvId !== 'new') {
            setActiveConversation(targetConvId);
            const loadedMessages = await loadMessagesWithOffline(targetConvId);
            setMessages(loadedMessages);
          } else {
            setActiveConversation(null);
            setIsNewConversation(true);
            setMessages([]);
          }
          
          if (!conversationId) {
            navigate(`/chat/${targetConvId}`, { replace: true });
          }
        } else {
          setIsNewConversation(true);
          setMessages([]);
          if (conversationId && conversationId !== 'new') {
            navigate('/chat/new', { replace: true });
          }
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
        showError(`Error loading conversations: ${err.message}`);
        if (!userProfile) {
          navigate('/login', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSessionAndLoad();
  }, [navigate, conversationId, userProfile, userLoading, loadMessagesWithOffline, showError]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || isSending || userLoading || !userProfile) return;

    const currentUserId = userProfile.id;

    // Free user conversation limit check
    if (!isPremium && history.length >= FREE_USER_CONVERSATION_LIMIT && isNewConversation) {
      showInfo(`As a free user, you are limited to ${FREE_USER_CONVERSATION_LIMIT} conversation. Please upgrade to premium to create more.`);
      return;
    }

    // Free user AI message limit check
    const aiMessagesCount = messages.filter(msg => msg.sender === 'ai').length;
    if (!isPremium && aiMessagesCount >= FREE_USER_AI_MESSAGE_LIMIT) {
      showInfo(`As a free user, you are limited to ${FREE_USER_AI_MESSAGE_LIMIT} AI messages per conversation. Please upgrade to premium.`);
      return;
    }

    setIsSending(true);
    let currentConversationId = activeConversation;
    const messageToSend = newMessage;
    setNewMessage(''); // Clear input field immediately for better UX

    // Optimistic UI update for user message
    const tempUserMsgId = gen_random_uuid();
    const newUserMsg = {
      id: tempUserMsgId,
      conversation_id: currentConversationId || 'new', // Use placeholder for new convos
      sender: 'user',
      content: messageToSend,
      content_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      // 1. Create new conversation if it's a new chat
      if (isNewConversation || !currentConversationId) {
        const title = messageToSend.substring(0, 30) || `Conversation ${history.length + 1}`;
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert([{ user_id: currentUserId, title }])
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create new conversation: ${error.message}`);
        }

        currentConversationId = newConv.id;
        setActiveConversation(newConv.id);
        setHistory(prev => [newConv, ...prev]);
        setIsNewConversation(false);
        navigate(`/chat/${newConv.id}`, { replace: true });
        showSuccess('New conversation created!');

        // Update conversation_id for the optimistically added message
        setMessages(prev => prev.map(msg =>
          msg.id === tempUserMsgId ? { ...msg, conversation_id: currentConversationId } : msg
        ));
      }

      // 2. Insert user message into Supabase
      // The message is already added optimistically, now we just save it
      const { data: insertedUserMsg, error: insertUserError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: currentConversationId,
          sender: 'user', // Ensure sender is explicitly 'user'
          content: messageToSend,
          content_type: 'text',
          created_at: newUserMsg.created_at,
        }])
        .select()
        .single();
      
      if (insertUserError) {
        throw new Error(`Failed to save message: ${insertUserError.message}`);
      }
      
      // Replace temporary user message with the actual message from DB for consistency
      setMessages(prev => prev.map(msg => (msg.id === tempUserMsgId ? insertedUserMsg : msg)));

      // 3. Call backend for AI response
      const allMessagesForApi = messages.filter(m => m.id !== tempUserMsgId);
      allMessagesForApi.push(insertedUserMsg);

      const res = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          conversation_id: currentConversationId,
          messages: allMessagesForApi.map(msg => ({ sender: msg.sender, content: msg.content })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        showError(errorData.error || 'Failed to get AI response.');
        setIsSending(false);
        return;
      }

      const data = await res.json();
      if (data.answer) {
        setMessages(prev => [...prev, {
          id: gen_random_uuid(),
          conversation_id: currentConversationId,
          sender: 'ai',
          content: data.answer,
          content_type: 'text',
          context: data.context || {},
          metadata: data.metadata || {},
          created_at: new Date().toISOString(),
        }]);

        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString(), summary: data.summary || null })
          .eq('id', currentConversationId);

        setHistory(prevHistory => prevHistory.map(conv => 
          conv.id === currentConversationId ? 
          { ...conv, updated_at: new Date().toISOString(), summary: data.summary || conv.summary || null } : 
          conv
        ));
      } else {
        throw new Error(data.error || 'Failed to get AI response.');
      }
    } catch (err) {
      console.error(err);
      showError(`Error: ${err.message}`);
      // Mark optimistic message as failed
      setMessages(prev => prev.map(msg => 
        msg.id === tempUserMsgId ? { ...msg, error: true } : msg
      ));
    } finally {
      setIsSending(false);
    }
  };

  const handleNewConversation = async () => {
    if (userLoading || !userProfile) return;

    const currentUserId = userProfile.id;

    if (!isPremium && history.length >= FREE_USER_CONVERSATION_LIMIT) {
      showInfo(`As a free user, you are limited to ${FREE_USER_CONVERSATION_LIMIT} conversation. Please upgrade to premium to create more.`); 
      return;
    }

    setActiveConversation(null);
    setMessages([]);
    setNewMessage('');
    setIsNewConversation(true);
    navigate('/chat/new');
    showInfo('Ready to start a new conversation. Send your first message!');
  };

  const handleRename = async (convId, newTitle) => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', convId)
        .eq('user_id', userProfile.id);

      if (error) throw error;

      setHistory(prev => prev.map(conv => conv.id === convId ? { ...conv, title: newTitle } : conv));
      // No need to update activeConversation state here, title is derived from history
      showSuccess('Conversation renamed successfully!');
      setEditingConvId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error renaming conversation:', error);
      showError(`Failed to rename conversation: ${error.message}`);
    }
  };

  const handleDeleteConversation = async (convId) => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', convId)
        .eq('user_id', userProfile.id);

      if (error) throw error;

      setHistory(prev => prev.filter(conv => conv.id !== convId));
      if (activeConversation === convId) {
        setActiveConversation(null);
        setMessages([]);
        navigate('/chat/new');
      }
      showSuccess('Conversation deleted successfully!');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showError(`Failed to delete conversation: ${error.message}`);
    }
  };

  const gen_random_uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDocumentPreview = (content, filename) => {
    setPreviewContent(content);
    setPreviewFilename(filename);
    setShowDocumentPreview(true);
  };

  const handlePersonalitySelect = (personalityId) => {
    setCurrentPersonality(personalityId);
  };

  const handleCategorySelect = (categoryId) => {
    setCurrentCategory(categoryId);
  };

  const handleMessageReaction = (messageId, reactionType) => {
    setMessageReactions(prev => ({
      ...prev,
      [messageId]: reactionType === prev[messageId] ? null : reactionType
    }));
  };

  const loadMoreMessages = async () => {
    if (!hasMore || isLoadingMore || !activeConversation) return;

    setIsLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender, content, created_at, content_type, context, metadata')
        .eq('conversation_id', activeConversation)
        .order('created_at', { ascending: true })
        .range(page * MESSAGES_PER_PAGE, (page + 1) * MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      if (data.length > 0) {
        setMessages(prevMessages => [...prevMessages, ...data]);
        setPage(prevPage => prevPage + 1);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
      showError(`Failed to load more messages: ${err.message}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-indigo-700">Loading user profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationSidebar 
        conversations={history}
        onSelectConversation={handleConversationSelect}
        onCreateNewConversation={handleNewConversation}
        activeConversationId={activeConversation}
        onRenameConversation={handleRename}
        onDeleteConversation={handleDeleteConversation}
        editingConvId={editingConvId}
        setEditingConvId={setEditingConvId}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        openMenuId={openMenuId}
        setOpenMenuId={setOpenMenuId}
        isNewConversation={isNewConversation}
        setIsNewConversation={setIsNewConversation}
        userProfile={userProfile}
      />
      <div className="flex-1 flex flex-col bg-gray-50">
        <ChatHeader 
          conversationTitle={activeConversation ? (history.find(c => c.id === activeConversation)?.title || 'New Chat') : 'New Chat'}
          activeConversationId={activeConversation}
          onRenameClick={(id, title) => { setEditingConvId(id); setEditingTitle(title); }}
          onDeleteClick={handleDeleteConversation}
          isNewConversation={isNewConversation}
        />

        {isOffline && <OfflineBanner queueLength={queueLength} error={error} />}

        <ChatMessages 
          messages={messages}
          messagesEndRef={messagesEndRef}
          isLoading={isLoading || isLoadingMessages}
          showDocumentPreview={showDocumentPreview}
          previewContent={previewContent}
          previewFilename={previewFilename}
          setShowDocumentPreview={setShowDocumentPreview}
          onMessageReaction={handleMessageReaction}
          messageReactions={messageReactions}
          loadMoreMessages={loadMoreMessages}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          conversationId={activeConversation}
        />

        <ChatInput 
          newMessage={newMessage}
          onChange={setNewMessage}
          handleSendMessage={handleSendMessage}
          isSending={isSending}
          showPersonalitySelector={showPersonalitySelector}
          setShowPersonalitySelector={setShowPersonalitySelector}
          currentPersonality={currentPersonality}
          handlePersonalitySelect={handlePersonalitySelect}
          showCategorySelector={showCategorySelector}
          setShowCategorySelector={setShowCategorySelector}
          currentCategory={currentCategory}
          handleCategorySelect={handleCategorySelect}
          docText={docText}
          setDocText={setDocText}
          handleKeyPress={handleKeyPress}
        />

        {!isPremium && (
          <div className="fixed bottom-4 right-4 z-50">
            <Button variant="primary" onClick={() => navigate('/pricing')}>
              Upgrade to Premium
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
