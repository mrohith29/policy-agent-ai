import React from 'react';

const DebugPanel = ({ debugInfo }) => {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md z-50">
      <h3 className="text-sm font-semibold mb-2">Debug Info</h3>
      <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
    </div>
  );
};

export default DebugPanel; 