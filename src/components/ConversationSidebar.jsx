import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X 
} from 'lucide-react';
import { deleteOfflineConversation } from '../utils/offlineUtils';

// Helper function to ensure UUID is string
const ensureUUIDString = (uuid) => {
  if (!uuid) return null;
  try {
    if (typeof uuid === 'string') return uuid;
    if (typeof uuid === 'object' && uuid !== null && 'toString' in uuid) {
      return uuid.toString();
    }
    return String(uuid);
  } catch (error) {
    console.error('Error converting UUID to string:', error);
    return null;
  }
};

const ConversationSidebar = ({ 
  conversations = [], 
  activeConversation = null, 
  onSelectConversation = () => {}, 
  onNewConversation = () => {},
  onRenameConversation = () => {},
  onDeleteConversation = () => {}
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleRename = (conversation) => {
    if (!conversation) return;
    setEditingId(conversation.id);
    setEditName(conversation.name || '');
  };

  const handleSaveRename = async () => {
    if (editName.trim()) {
      const conversationId = ensureUUIDString(editingId);
      if (conversationId) {
        await onRenameConversation(conversationId, editName.trim());
      }
    }
    setEditingId(null);
    setEditName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
      setEditName('');
    }
  };

  const handleDelete = async (conversation) => {
    if (!conversation) return;
    const conversationId = ensureUUIDString(conversation.id);
    if (conversationId) {
      await onDeleteConversation(conversationId);
      await deleteOfflineConversation(conversationId);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      <div className="p-4">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Array.isArray(conversations) && conversations.map((conversation) => {
          if (!conversation) return null;
          
          const conversationId = ensureUUIDString(conversation.id);
          const isActive = conversationId === ensureUUIDString(activeConversation?.id);
          
          return (
            <div
              key={conversationId || Math.random()}
              className={`p-4 border-b border-gray-200 hover:bg-gray-100 cursor-pointer ${
                isActive ? 'bg-blue-50' : ''
              }`}
            >
              {editingId === conversationId ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="conversation-rename"
                    name="conversation-rename"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-2 py-1 border rounded"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveRename}
                    className="p-1 text-green-600 hover:text-green-700"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditName('');
                    }}
                    className="p-1 text-red-600 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 flex-1"
                    onClick={() => onSelectConversation(conversation)}
                  >
                    <MessageSquare size={16} className="text-gray-500" />
                    <span className="truncate">{conversation.name || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRename(conversation)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(conversation)}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationSidebar; 