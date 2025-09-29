
import React from 'react';
import { ChatMessage as ChatMessageType, MessageRole } from '../types';
import { UserIcon, RadhaIcon } from './IconComponents';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;

  if (!message.text && message.role === MessageRole.MODEL) {
    return null; // Don't render empty model messages (placeholders)
  }

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <RadhaIcon />
        </div>
      )}
      <div
        className={`rounded-2xl p-4 max-w-md md:max-w-lg lg:max-w-xl shadow-md ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-slate-700 text-gray-200 rounded-bl-none'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
      {isUser && (
        <div className="flex-shrink-0">
          <UserIcon />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
