import React from 'react';
import { PlusCircle } from 'lucide-react';
import Button from './Button';
import ConversationItem from './ConversationItem';

const Sidebar = ({
  conversations,
  activeConversation,
  onConversationSelect,
  onNewConversation
}) => {
  return (
    <aside className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col h-full">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-xl font-bold flex items-center">
          <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            PolicyChat AI
          </span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        {conversations.map(conv => (
          <ConversationItem
            key={conv.id}
            id={conv.id}
            title={conv.title}
            isActive={activeConversation === conv.id}
            onClick={() => onConversationSelect(conv.id)}
          />
        ))}
        
        {conversations.length === 0 && (
          <div className="text-gray-400 text-center p-4 text-sm">
            No conversations yet
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <Button
          onClick={onNewConversation}
          variant="primary"
          className="w-full py-2"
          leftIcon={<PlusCircle size={18} />}
        >
          New Conversation
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;