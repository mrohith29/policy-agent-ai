import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import DocumentUpload from './DocumentUpload';

const ChatInput = ({
  value = '',
  onChange = () => {},
  onSend = () => {},
  onKeyPress = () => {},
  isSending = false,
  onDocumentParsed = () => {}
}) => {
  const handleSend = () => {
    if (value?.trim()) {
      onSend();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    onKeyPress(e);
  };

  return (
    <div className="border-t border-gray-200 p-6 bg-white">
      <div className="p-4 bg-white border-b border-gray-300">
        <DocumentUpload onDocumentParsed={onDocumentParsed} />
      </div>
      <div className="flex items-center space-x-4 w-full max-w-xl mx-auto">
        <textarea
          id="chat-message"
          name="chat-message"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isSending ? "Waiting for response..." : "Type your message here..."}
          className={`flex-1 p-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[44px] max-h-40 overflow-y-auto resize-none transition-colors ${
            isSending ? 'bg-gray-50 cursor-not-allowed' : ''
          }`}
          rows={1}
          disabled={isSending}
        />
        <button
          onClick={handleSend}
          disabled={isSending || !value?.trim()}
          className={`flex items-center justify-center bg-indigo-600 text-white px-6 py-3 rounded-full transition-colors ${
            isSending || !value?.trim() 
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
  );
};

export default ChatInput; 