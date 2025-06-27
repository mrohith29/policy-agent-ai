import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Crown
} from 'lucide-react';
import { deleteOfflineConversation } from '../utils/offlineUtils';

// Helper function to ensure UUID is string (might be redundant if IDs are always strings from DB)
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
  activeConversationId = null, // Renamed from activeConversation
  onSelectConversation = () => {},
  onCreateNewConversation = () => {}, // Renamed from onNewConversation
  onRenameConversation = () => {},
  onDeleteConversation = () => {},
  editingConvId,
  setEditingConvId,
  editingTitle,
  setEditingTitle,
  openMenuId,
  setOpenMenuId,
  isNewConversation, // Prop from Chat.jsx
  setIsNewConversation, // Prop from Chat.jsx
  userProfile,
  isPremium // <-- new prop
}) => {

  const handleRename = (conversation) => {
    if (!conversation) return;
    setEditingConvId(conversation.id);
    setEditingTitle(conversation.title || ''); // Use conversation.title
  };

  const handleSaveRename = async () => {
    if (editingTitle.trim()) {
      const conversationId = ensureUUIDString(editingConvId);
      if (conversationId) {
        await onRenameConversation(conversationId, editingTitle.trim());
      }
    }
    setEditingConvId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingConvId(null);
      setEditingTitle('');
    }
  };

  const handleDelete = async (conversation) => {
    if (!conversation) return;
    const conversationId = ensureUUIDString(conversation.id);
    if (conversationId) {
      await onDeleteConversation(conversationId);
      // Assuming deleteOfflineConversation is still relevant for local cache
      await deleteOfflineConversation(conversationId);
    }
  };

  const handleConversationClick = (conversation) => {
    onSelectConversation(conversation);
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={onCreateNewConversation} // Use new prop name
          className="flex-1 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {conversations.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">No conversations yet. Start a new one!</p>
        )}

        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`conversation-card p-3 rounded-lg cursor-pointer transition-colors group relative ${
              activeConversationId === conversation.id ? 'active bg-indigo-100' : 'hover:bg-gray-100'
            }`}
            onClick={() => handleConversationClick(conversation)}
          >
            {editingConvId === conversation.id ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1 text-green-600 hover:text-green-700"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => { setEditingConvId(null); setEditingTitle(''); }} // Cancel edit
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div 
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1 truncate">
                  <MessageSquare size={16} className="text-gray-500" />
                  <span className="truncate font-medium text-gray-800">{conversation.title || 'Untitled Conversation'}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRename(conversation); }}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-200"
                    title="Rename Conversation"
                  >
                    <Edit2 size={16} />
                  </button>
                  {isPremium && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(conversation); }}
                      className="p-1 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-200"
                      title="Delete Conversation"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {userProfile && (
        <div className="p-4 border-t border-gray-200 bg-white flex flex-col gap-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            {isPremium ? (
              <Crown size={16} className="text-yellow-500" />
            ) : (
              <MessageSquare size={16} className="text-gray-500" />
            )}
            <span>{userProfile.email}</span>
          </div>
          <div className="font-semibold">
            {isPremium ? (
              <span className="text-green-600">Premium User</span>
            ) : (
              <span className="text-blue-600">Free User</span>
            )}
          </div>
          {!isPremium && userProfile.premium_end_date && (
            <p className="text-xs text-gray-500">Premium ends: {new Date(userProfile.premium_end_date).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationSidebar; 