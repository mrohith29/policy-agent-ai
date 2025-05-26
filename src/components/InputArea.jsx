import React, { useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import Button from './Button';

const InputArea = ({
  value,
  onChange,
  onSend,
  onKeyDown,
  onDocumentUpload
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleTextareaChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className={`
      p-4 bg-white border-t border-gray-100
      transition-shadow duration-200 ease-in-out
      ${isFocused ? 'shadow-md' : 'shadow-sm'}
    `}>
      <div className="max-w-3xl mx-auto flex items-end space-x-2">
        <button 
          onClick={onDocumentUpload}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          <Paperclip size={20} />
        </button>
        
        <div className="flex-1 relative">
          <textarea
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={onKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type your message here..."
            className="w-full p-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[44px] max-h-40 resize-none bg-gray-50"
            rows={1}
            style={{ overflow: 'auto' }}
          />
        </div>

        <Button 
          onClick={onSend} 
          disabled={!value.trim()}
          variant="primary"
          size="md"
          className="rounded-full h-10 w-10 p-0 flex items-center justify-center"
        >
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
};

export default InputArea;
