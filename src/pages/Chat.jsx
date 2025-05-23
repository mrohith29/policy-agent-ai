import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import DocumentUpload from './DocumentUpload';

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { question } = location.state || { question: '' };
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [history, setHistory] = useState([
    { id: 1, title: 'Conversation 1' },
    { id: 2, title: 'Conversation 2' },
  ]);
  const [activeConversation, setActiveConversation] = useState(1);
  const messagesEndRef = useRef(null);
  const questionAddedRef = useRef(false);
  const [docText, setDocText] = useState('');

  useEffect(() => {
    // Check if user is authenticated
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (question && !questionAddedRef.current) {
      setMessages(prev => [...prev, { type: 'user', content: question }]);
      questionAddedRef.current = true;
    }
  }, [question]);

  useEffect(() => {
    if (docText) {
      setMessages(prev => [...prev, { type: 'user', content: `Uploaded Document Content:\n${docText}` }]);
    }
  }, [docText]);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      const updatedMessages = [...messages, { type: 'user', content: newMessage }];
      setMessages(updatedMessages);
      setNewMessage('');

      try {
        const response = await fetch('http://localhost:8000/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: updatedMessages }),
        });

        const data = await response.json();
        console.log('Response from backend:', data);

        if (response.ok && data.answer) {
          setMessages(prev => [...prev, { type: 'ai', content: data.answer }]);
        } else {
          setMessages(prev => [...prev, { type: 'ai', content: `Error: ${data.error}` }]);
        }
      } catch (error) {
        console.error('Network error:', error);
        setMessages(prev => [...prev, { type: 'ai', content: 'Error fetching response' }]);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-72 bg-gray-900 text-white flex flex-col p-4 border-r border-gray-200">
        <div className="text-lg font-bold mb-6">Conversations</div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {history.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeConversation === conv.id ? 'bg-gray-700' : 'hover:bg-gray-800'
              }`}
            >
              {conv.title}
            </button>
          ))}
        </div>
        <button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">
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
    </div>
  );
};

export default Chat;