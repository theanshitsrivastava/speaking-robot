import React from 'react';
import { MicrophoneIcon, StopIcon } from './IconComponents';

interface ChatInputProps {
  onToggleConversation: () => void;
  isConnecting: boolean;
  isSessionActive: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onToggleConversation, isConnecting, isSessionActive }) => {
  
  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isSessionActive) return 'Conversation is active...';
    return 'Click the microphone to start talking';
  };

  return (
    <div className="p-4 bg-slate-800 border-t border-slate-700">
      <div className="flex items-center justify-center space-x-4 max-w-4xl mx-auto">
        <button
          type="button"
          disabled={isConnecting}
          onClick={onToggleConversation}
          className={`rounded-full p-4 transition-all duration-300 ease-in-out flex-shrink-0 text-white shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50
            ${
              isSessionActive
                ? 'bg-red-600 hover:bg-red-500 focus:ring-red-400'
                : 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-400'
            } 
            ${isConnecting ? 'animate-pulse' : ''}
            disabled:bg-slate-600 disabled:cursor-not-allowed`}
          aria-label={isSessionActive ? 'Stop conversation' : 'Start conversation'}
        >
          {isSessionActive ? <StopIcon /> : <MicrophoneIcon />}
        </button>
      </div>
       <p className="text-center text-slate-400 text-sm mt-2">{getStatusText()}</p>
    </div>
  );
};

export default ChatInput;
