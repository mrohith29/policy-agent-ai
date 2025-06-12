import React from 'react';

const ChatHeader = ({
  currentPersonality,
  currentCategory,
  onPersonalitySelect,
  onCategorySelect
}) => {
  return (
    <div className="flex justify-between items-center p-4 border-b bg-white">
      <div className="flex items-center space-x-4">
        <button
          onClick={onPersonalitySelect}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <span className="text-sm font-medium">AI Personality</span>
          <span className="text-xs text-gray-500">({currentPersonality})</span>
        </button>
        <button
          onClick={onCategorySelect}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <span className="text-sm font-medium">Category</span>
          <span className="text-xs text-gray-500">({currentCategory})</span>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader; 