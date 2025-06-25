import React, { useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

const ChatInput = ({
  newMessage = '',
  onChange = () => {},
  handleSendMessage = () => {},
  handleKeyPress = () => {},
  isSending = false,
}) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const onTextareaKeyPress = (e) => {
    // This now correctly calls the handler from Chat.jsx
    handleKeyPress(e);
  };
  
  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <div className="relative flex items-center w-full max-w-3xl mx-auto bg-gray-100 rounded-2xl">
        <TextareaAutosize
          ref={textareaRef}
          value={newMessage}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onTextareaKeyPress}
          placeholder={isSending ? "Waiting for response..." : "Ask the AI Policy Agent..."}
          className="w-full p-3 pr-20 bg-transparent rounded-2xl focus:outline-none resize-none text-gray-800 placeholder-gray-500"
          maxRows={8}
          rows={1}
          disabled={isSending}
        />
        <div className="absolute right-2 bottom-1.5 flex items-center">
          <button
            onClick={handleSendMessage}
            disabled={isSending || !newMessage?.trim()}
            className={`flex items-center justify-center h-10 w-10 bg-indigo-600 text-white rounded-full transition-all duration-200 ease-in-out ${
              isSending || !newMessage?.trim() 
                ? 'opacity-50 cursor-not-allowed scale-95' 
                : 'hover:bg-indigo-700 hover:scale-105 active:scale-100'
            }`}
            aria-label="Send message"
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
  );
};

export default ChatInput; 