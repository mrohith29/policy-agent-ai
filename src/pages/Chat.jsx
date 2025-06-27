import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { MoreVertical, Send, Loader2, Trash2, Pencil, WifiOff, FileText } from 'lucide-react';
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
import DocumentUpload from '../components/DocumentUpload';

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
  const { userProfile, userLoading, isPremium, refreshUserProfile } = useContext(UserContext);
  const { isOffline, queueLength, error, queueMessage, loadMessages: loadMessagesWithOffline } = useOffline(activeConversation);

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [uploadError, setUploadError] = useState(null);

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
    if (!isPremium && history.length >= FREE_USER_CONVERSATION_LIMIT && isNewConversation) {
      showInfo(`As a free user, you are limited to ${FREE_USER_CONVERSATION_LIMIT} conversation. Please upgrade to premium to create more.`);
      return;
    }
    const aiMessagesCount = messages.filter(msg => msg.sender === 'ai').length;
    if (!isPremium && aiMessagesCount >= FREE_USER_AI_MESSAGE_LIMIT) {
      showInfo(`As a free user, you are limited to ${FREE_USER_AI_MESSAGE_LIMIT} AI messages per conversation. Please upgrade to premium.`);
      return;
    }
    setIsSending(true);
    let currentConversationId = activeConversation;
    const messageToSend = newMessage;
    setNewMessage('');
    const tempUserMsgId = gen_random_uuid();
    // If a document was uploaded, append a document icon and filename to the user's message
    let userMsgContent = messageToSend;
    if (uploadedDoc && uploadedDoc.success && uploadedDoc.name) {
      userMsgContent = `📄 [${uploadedDoc.name}]\n` + userMsgContent;
    }
    const newUserMsg = {
      id: tempUserMsgId,
      conversation_id: currentConversationId || 'new',
      sender: 'user',
      content: userMsgContent,
      content_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMsg]);
    try {
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
        setMessages(prev => prev.map(msg =>
          msg.id === tempUserMsgId ? { ...msg, conversation_id: currentConversationId } : msg
        ));
      }
      // Fetch document context for this conversation
      let ragContext = '';
      try {
        const { data: docChunks, error: docError } = await supabase
          .from('document_contexts')
          .select('content')
          .eq('conversation_id', currentConversationId);
        if (!docError && docChunks && docChunks.length > 0) {
          ragContext = docChunks.map(chunk => chunk.content).join('\n---\n');
        }
      } catch (e) { /* ignore */ }
      // Insert user message into Supabase
      const { data: insertedUserMsg, error: insertUserError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: currentConversationId,
          sender: 'user',
          content: userMsgContent,
          content_type: 'text',
          created_at: newUserMsg.created_at,
        }])
        .select()
        .single();
      if (insertUserError) {
        throw new Error(`Failed to save message: ${insertUserError.message}`);
      }
      setMessages(prev => prev.map(msg => (msg.id === tempUserMsgId ? insertedUserMsg : msg)));
      // Call backend for AI response, always include RAG context
      const allMessagesForApi = messages.filter(m => m.id !== tempUserMsgId);
      allMessagesForApi.push(insertedUserMsg);
      const res = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          conversation_id: currentConversationId,
          messages: allMessagesForApi.map(msg => ({ sender: msg.sender, content: msg.content })),
          rag_context: ragContext,
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
      setMessages(prev => prev.map(msg => 
        msg.id === tempUserMsgId ? { ...msg, error: true } : msg
      ));
    } finally {
      setIsSending(false);
      // Clear uploadedDoc after sending a message
      setUploadedDoc(null);
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

  const handleDocumentUpload = async (file) => {
    setUploadingDoc(true);
    setUploadError(null);
    setUploadedDoc({ name: file.name });
    let conversationId = activeConversation;
    if (!conversationId) {
      const title = file.name || `Conversation ${history.length + 1}`;
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert([{ user_id: userProfile.id, title }])
        .select()
        .single();
      if (error) {
        showError('Failed to create conversation for document upload');
        setUploadingDoc(false);
        return;
      }
      conversationId = newConv.id;
      setActiveConversation(newConv.id);
      setHistory(prev => [newConv, ...prev]);
      setIsNewConversation(false);
      navigate(`/chat/${newConv.id}`, { replace: true });
    }
    // Now upload the document
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', conversationId);
    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        setUploadError('Upload failed: Invalid server response.');
        setUploadedDoc(null);
        showError('Upload failed: Invalid server response.');
        return;
      }
      if (!response.ok) {
        // Show backend error if present
        const errorMsg = data && data.error ? data.error : 'Upload failed.';
        setUploadError(errorMsg);
        setUploadedDoc(null);
        showError(errorMsg);
        return;
      }
      // Success if at least one chunk was stored
      if ((data.stored && data.stored > 0) || (data.chunks && data.chunks > 0)) {
        setDocText(data.text);
        setUploadedDoc({ name: data.filename, success: true });
        showSuccess(`Document '${data.filename}' uploaded and processed!`);
        setMessages(prev => [
          ...prev,
          {
            id: `doc-${Date.now()}`,
            conversation_id: conversationId,
            sender: 'system',
            content: `Document "${data.filename}" uploaded and available for questions.`,
            content_type: 'document',
            metadata: { filename: data.filename },
            created_at: new Date().toISOString(),
          }
        ]);
      } else {
        setUploadError('Upload failed: No document chunks stored.');
        setUploadedDoc(null);
        showError('Upload failed: No document chunks stored.');
      }
    } catch (err) {
      setUploadError(err.message);
      setUploadedDoc(null);
      showError(err.message);
    } finally {
      setUploadingDoc(false);
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
        onDeleteConversation={isPremium ? handleDeleteConversation : undefined}
        editingConvId={editingConvId}
        setEditingConvId={setEditingConvId}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        openMenuId={openMenuId}
        setOpenMenuId={setOpenMenuId}
        isNewConversation={isNewConversation}
        setIsNewConversation={setIsNewConversation}
        userProfile={userProfile}
        isPremium={isPremium}
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

        <div className="flex flex-row items-center gap-2 px-4 py-2">
          <input
            type="file"
            onChange={e => {
              const file = e.target.files[0];
              if (file) handleDocumentUpload(file);
              e.target.value = '';
            }}
            disabled={isSending || uploadingDoc}
          />
          {uploadingDoc && (
            <div className="flex items-center gap-2 animate-pulse">
              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
              <span className="text-gray-700">Uploading...</span>
            </div>
          )}
          {uploadedDoc && (
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <span className="text-gray-800 font-medium">{uploadedDoc.name}</span>
              {uploadedDoc.success && <span className="text-green-600 ml-1">✓</span>}
            </div>
          )}
          {uploadError && (
            <div className="text-red-600 text-sm ml-2">{uploadError}</div>
          )}
        </div>

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
