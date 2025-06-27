import React, { memo, useCallback, useRef } from 'react';
import { MessageReaction } from './ChatComponents';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Loader2, AlertTriangle, FileText } from 'lucide-react';

const Message = memo(({ message, messageReactions, onMessageReaction }) => {
  const isUser = message.sender === 'user';
  const isError = message.content_type === 'error' || message.error;
  let messageContent = message.content;
  let docFilename = null;
  // Detect document marker and extract filename
  if (typeof messageContent === 'string' && messageContent.startsWith('📄 [')) {
    const match = messageContent.match(/^📄 \[(.+?)\]\n/);
    if (match) {
      docFilename = match[1];
      messageContent = messageContent.replace(/^📄 \[.+?\]\n/, '');
    }
  }
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 flex items-start gap-2 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-white text-gray-800 rounded-bl-none shadow-md'
        } ${isError ? 'bg-red-100 text-red-800 border border-red-300' : ''}`}
      >
        {isError && <AlertTriangle className="h-5 w-5 mt-0.5 text-red-500 flex-shrink-0" />}
        {docFilename && (
          <span className="flex items-center gap-1 mr-2 text-indigo-600 font-medium">
            <FileText className="h-5 w-5" />
            {docFilename}
          </span>
        )}
        <p className="whitespace-pre-wrap break-words">{messageContent}</p>
        {!isUser && !isError && (
          <MessageReaction
            messageId={message.id}
            reactions={messageReactions[message.id] || null}
            onReact={onMessageReaction}
            messageContent={message.content}
          />
        )}
      </div>
    </div>
  );
});

Message.displayName = 'Message';

const ChatMessages = ({ messages, messageReactions, onMessageReaction, isLoading, showDocumentPreview, previewContent, previewFilename, setShowDocumentPreview, loadMoreMessages, hasMore, isLoadingMore, conversationId }) => {
  const listRef = useRef();

  const Row = useCallback(({ index, style }) => {
    const message = messages[index];
    if (!message) return null;
    return (
      <div style={style}>
        <Message
          message={message}
          messageReactions={messageReactions}
          onMessageReaction={onMessageReaction}
        />
      </div>
    );
  }, [messages, messageReactions, onMessageReaction]);

  const getItemSize = useCallback((index) => {
    const message = messages[index];
    if (!message) return 60;
    const contentLen = message.content?.length || 0;
    // More compact estimation logic
    const baseHeight = 32; // for padding, etc.
    const charsPerLine = 50; // Slightly more per line
    const lineHeight = 18;
    const numLines = Math.ceil(contentLen / charsPerLine);
    return baseHeight + (numLines * lineHeight);
  }, [messages]);

  React.useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, "auto");
    }
  }, [messages, conversationId]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="ml-4 text-indigo-700 mt-4">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div className="text-gray-500">
          <h2 className="text-2xl font-semibold mb-2">Start a new conversation</h2>
          <p>Send a message to begin your chat with the AI Policy Agent.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={messages.length}
            itemSize={getItemSize}
            estimatedItemSize={100}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
      {isLoadingMore && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 p-2 bg-indigo-100 rounded-full flex items-center gap-2 text-indigo-700 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading more...
        </div>
      )}
    </div>
  );
};

export default memo(ChatMessages); 