import React from 'react';
import { X, ThumbsUp, ThumbsDown, Share2, Copy, Flag } from 'lucide-react';

// Document Preview Component
const DocumentPreview = ({ content, filename, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-3/4 h-3/4 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{filename}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
        </div>
      </div>
    </div>
  );
};

// Message Reaction Component
const MessageReaction = ({ messageId, reactions, onReact, messageContent }) => {
  const safeReactions = Array.isArray(reactions) ? reactions : [];
  const reactionTypes = [
    { 
      icon: <ThumbsUp size={16} />, 
      type: 'thumbsUp',
      tooltip: 'Helpful response'
    },
    { 
      icon: <ThumbsDown size={16} />, 
      type: 'thumbsDown',
      tooltip: 'Not helpful'
    },
    { 
      icon: <Share2 size={16} />, 
      type: 'share',
      tooltip: 'Share message'
    }
  ];

  const handleReaction = (type) => {
    if (type === 'share') {
      // Create a shareable link with the message content
      const shareableText = `Message from PolicyChat AI:\n\n${messageContent}\n\nShared via PolicyChat AI`;
      
      if (navigator.share) {
        // Use Web Share API if available
        navigator.share({
          title: 'Shared Message from PolicyChat AI',
          text: shareableText
        }).catch(console.error);
      } else {
        // Fallback to clipboard copy
        navigator.clipboard.writeText(shareableText)
          .then(() => {
            // Show a temporary tooltip or notification
            const tooltip = document.createElement('div');
            tooltip.textContent = 'Message copied to clipboard!';
            tooltip.style.cssText = `
              position: fixed;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 8px 16px;
              border-radius: 4px;
              z-index: 1000;
            `;
            document.body.appendChild(tooltip);
            setTimeout(() => tooltip.remove(), 2000);
          })
          .catch(console.error);
      }
    } else {
      // For thumbs up/down, call the original onReact handler
      onReact(messageId, type);
    }
  };

  return (
    <div className="flex items-center space-x-1 mt-2">
      {reactionTypes.map(({ icon, type, tooltip }) => {
        const count = safeReactions.filter(r => r === type).length;
        return (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            title={tooltip}
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm transition-colors ${
              safeReactions.includes(type)
                ? 'bg-indigo-100 text-indigo-600'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            {icon}
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

// AI Personality Selector Component
const AIPersonalitySelector = ({ currentPersonality, onSelect }) => {
  const personalities = [
    { id: 'default', name: 'Default', description: 'Balanced and professional' },
    { id: 'friendly', name: 'Friendly', description: 'Casual and approachable' },
    { id: 'formal', name: 'Formal', description: 'Professional and precise' },
    { id: 'concise', name: 'Concise', description: 'Brief and to the point' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 p-6">
        <h2 className="text-xl font-semibold mb-4">Select AI Personality</h2>
        <div className="space-y-3">
          {personalities.map(personality => (
            <button
              key={personality.id}
              onClick={() => onSelect(personality.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentPersonality === personality.id
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{personality.name}</div>
              <div className="text-sm text-gray-500">{personality.description}</div>
            </button>
          ))}
        </div>
        <button
          onClick={() => onSelect(null)}
          className="mt-4 w-full p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Category Selector Component
const CategorySelector = ({ currentCategory, onSelect }) => {
  const categories = [
    { id: 'general', name: 'General', color: 'bg-gray-500' },
    { id: 'work', name: 'Work', color: 'bg-blue-500' },
    { id: 'personal', name: 'Personal', color: 'bg-green-500' },
    { id: 'research', name: 'Research', color: 'bg-purple-500' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-80 p-6">
        <h2 className="text-xl font-semibold mb-4">Select Category</h2>
        <div className="space-y-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                currentCategory === category.id
                  ? 'bg-indigo-100'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${category.color}`} />
              <span>{category.name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onSelect(null)}
          className="mt-4 w-full p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export {
  DocumentPreview,
  MessageReaction,
  AIPersonalitySelector,
  CategorySelector
}; 