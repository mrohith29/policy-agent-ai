import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import DocumentUpload from './DocumentUpload';
import { Pencil } from 'lucide-react';
import { API_BASE_URL, apiCall } from '../utils/api';

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
  const [isLoading, setIsLoading] = useState(true);

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
        const conversations = await apiCall(`/conversations/${user_id}`);
        
        if (conversations.length > 0) {
          setHistory(conversations);
          
          const targetConvId = conversationId || conversations[0].id;
          setActiveConversation(targetConvId);
          loadMessages(targetConvId);
          
          if (!conversationId) {
            navigate(`/chat/${targetConvId}`, { replace: true });
          }
        } else {
          const newConv = await apiCall('/conversations', {
            method: 'POST',
            body: JSON.stringify({ 
              user_id, 
              title: 'New Conversation' 
            }),
          });
          
          if (newConv?.id) {
            setHistory([{ id: newConv.id, title: 'New Conversation' }]);
            setActiveConversation(newConv.id);
            navigate(`/chat/${newConv.id}`, { replace: true });
            setMessages([]);
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
    try {
      const data = await apiCall(`/messages/${conversation_id}`);
      const formatted = data.map(msg => ({
        type: msg.sender === 'user' ? 'user' : 'ai',
        content: msg.content,
      }));
      setMessages(formatted);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
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

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    const newMsg = { type: 'user', content: newMessage };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setNewMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session?.user?.id;

      if (!user_id || !activeConversation) {
        console.error("Missing user_id or activeConversation");
        return;
      }

      const data = await apiCall('/ask', {
        method: 'POST',
        body: JSON.stringify({
          user_id,
          conversation_id: activeConversation,
          messages: updatedMessages,
        }),
      });

      if (data.answer) {
        setMessages(prev => [...prev, { type: 'ai', content: data.answer }]);
      } else {
        setMessages(prev => [...prev, { type: 'ai', content: `Error: ${data.error}` }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [...prev, { type: 'ai', content: 'Network error occurred.' }]);
    }
  };

  const handleNewConversation = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user_id = session.user.id;
    
      const title = `Conversation ${history.length + 1}`;
    
      const newConv = await apiCall('/conversations', {
        method: 'POST',
        body: JSON.stringify({ user_id, title }),
      });
    
      if (newConv?.id) {
        const newConversation = { id: newConv.id, title };
        setHistory(prev => [...prev, newConversation]);
        setActiveConversation(newConv.id);
        navigate(`/chat/${newConv.id}`);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const handleRename = async (convId) => {
    if (!editingTitle.trim()) return;
  
    try {
      await apiCall(`/conversations/${convId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editingTitle }),
      });
  
      setHistory(prev =>
        prev.map(conv =>
          conv.id === convId ? { ...conv, title: editingTitle } : conv
        )
      );
    } catch (err) {
      console.error("Failed to rename:", err);
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
                <button
                  key={conv.id}
                  onClick={() => handleConversationSelect(conv.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeConversation === conv.id ? 'bg-gray-700' : 'hover:bg-gray-800'
                  }`}
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
                    <div
                      onDoubleClick={() => {
                        setEditingConvId(conv.id);
                        setEditingTitle(conv.title);
                      }}
                      className="flex items-center justify-between group"
                    >
                      <span>{conv.title}</span>
                      <Pencil 
                        size={14} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                      />
                    </div>
                  )}
                </button>
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
                  placeholder="Type your message here..."
                  className="flex-1 p-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[44px] max-h-40 overflow-y-auto resize-none"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
