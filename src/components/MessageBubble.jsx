import React from 'react';

const MessageBubble = ({ type, content, isNew = false }) => {
  const isUser = type === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-animation`}
    >
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
            AI
          </div>
        </div>
      )}

      <div
        className={`
          max-w-[75%] px-4 py-3 rounded-2xl
          ${isUser 
            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-br-none' 
            : 'bg-white border border-gray-100 shadow-subtle text-gray-800 rounded-bl-none'}
          ${isNew ? 'animate-fade-in' : ''}
        `}
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 bg-gradient-to-r from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white text-xs font-medium">
            You
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
