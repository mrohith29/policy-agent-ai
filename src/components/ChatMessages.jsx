import React from 'react';
import { MessageReaction } from './ChatComponents';

const ChatMessages = ({ messages, messageReactions, onMessageReaction, messagesEndRef }) => {
  return (
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
              onReact={onMessageReaction}
              messageContent={message.content}
            />
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages; 