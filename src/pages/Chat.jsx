import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import DocumentUpload from './DocumentUpload';
import { MoreVertical, Send, Loader2, Trash2, Pencil } from 'lucide-react';
import { DocumentPreview, MessageReaction, AIPersonalitySelector, CategorySelector } from '../components/ChatComponents';

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
          loadMessages(targetConvId);
          
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

  const loadMessages = async (conversation_id) => {
    const res = await fetch(`http://localhost:8000/messages/${conversation_id}`);
    const data = await res.json();
    const formatted = data.map(msg => ({
      type: msg.sender === 'user' ? 'user' : 'ai',
      content: msg.content,
    }));
    setMessages(formatted);
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    if (question && !questionAddedRef.current && activeConversation) {
      setMessages(prev => [...prev, { type: 'user', content: question }]);
      questionAddedRef.current = true;
    }
  }, [question, activeConversation]);

  useEffect(() => {
    if (docText) {
      setMessages(prev => [...prev, { type: 'user', content: `Uploaded Document Content:\n${docText}` }]);
    }
  }, [docText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        setMessages(prev => [...prev, { type: 'ai', content: data.answer }]);
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

  const handleRename = async (convId) => {
    if (!editingTitle.trim()) return;
  
    try {
      const res = await fetch(`http://localhost:8000/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle }),
      });
      console.log(convId)
  
      if (res.ok) {
        setHistory(prev =>
          prev.map(conv =>
            conv.id === convId ? { ...conv, title: editingTitle } : conv
          )
        );
      } else {
        const error = await res.json();
        console.error("Failed to rename:", error.detail || "Unknown error");
        // Optionally show an error message to the user
      }
    } catch (err) {
      console.error("Failed to rename:", err);
      // Optionally show an error message to the user
    }
  
    setEditingConvId(null);
    setEditingTitle('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConversationSelect = (convId) => {
    setActiveConversation(convId);
    loadMessages(convId);
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

  return (
    <div className="flex h-screen bg-gray-50">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          <div className="w-72 bg-gray-900 text-white flex flex-col p-4 border-r border-gray-200">
            <div className="text-lg font-bold mb-6">Conversations</div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {history.map(conv => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between px-4 py-2 rounded-lg transition-colors ${
                    activeConversation === conv.id ? 'bg-gray-700' : 'hover:bg-gray-800'
                  }`}
                >
                  <button
                    onClick={() => handleConversationSelect(conv.id)}
                    className="flex-1 text-left"
                  >
                    {editingConvId === conv.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRename(conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(conv.id);
                        }}
                        autoFocus
                        className="bg-gray-800 text-white w-full rounded px-2 py-1"
                      />
                    ) : (
                      <span className="truncate">{conv.title}</span>
                    )}
                  </button>
                  <div className="relative conversation-menu">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === conv.id ? null : conv.id);
                      }}
                      className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openMenuId === conv.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg py-1 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(conv.title);
                            setEditingConvId(conv.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <Pencil size={14} />
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleNewConversation}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
            >
              + New Conversation
            </button>
          </div>

          <div className="flex flex-col flex-1 h-full">
            <div className="flex justify-between items-center p-4 border-b bg-white">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowPersonalitySelector(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  <span className="text-sm font-medium">AI Personality</span>
                  <span className="text-xs text-gray-500">({currentPersonality})</span>
                </button>
                <button
                  onClick={() => setShowCategorySelector(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  <span className="text-sm font-medium">Category</span>
                  <span className="text-xs text-gray-500">({currentCategory})</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none shadow-md'
                    }`}
                  >
                    {message.content}
                    <MessageReaction
                      messageId={index}
                      reactions={messageReactions[index] || []}
                      onReact={handleMessageReaction}
                      messageContent={message.content}
                    />
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 p-6 bg-white flex justify-center">
              <div className="p-4 bg-white border-b border-gray-300">
                <DocumentUpload onDocumentParsed={setDocText} />
              </div>
              <div className="flex items-center space-x-4 w-full max-w-xl">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isSending ? "Waiting for response..." : "Type your message here..."}
                  className={`flex-1 p-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[44px] max-h-40 overflow-y-auto resize-none ${
                    isSending ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                  rows={1}
                  disabled={isSending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className={`flex items-center justify-center bg-indigo-600 text-white px-6 py-3 rounded-full transition-colors ${
                    isSending || !newMessage.trim() 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-indigo-700'
                  }`}
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Modals */}
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
            />
          )}

          {showCategorySelector && (
            <CategorySelector
              currentCategory={currentCategory}
              onSelect={handleCategorySelect}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Chat;
