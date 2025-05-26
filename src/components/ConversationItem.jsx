import React from 'react';
import { MessageSquare } from 'lucide-react';

const ConversationItem = ({
  id,
  title,
  isActive,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={`conversation-card ${isActive ? 'active' : ''}`}
    >
      <span className={`${isActive ? 'text-white' : 'text-indigo-500 group-hover:text-indigo-600'}`}>
        <MessageSquare size={18} />
      </span>
      <span className="truncate flex-1 text-left">{title}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 bg-white rounded-full ml-2 animate-pulse"></span>
      )}
    </button>
  );
};

export default ConversationItem;
