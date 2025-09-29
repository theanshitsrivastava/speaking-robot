
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Session, LiveServerMessage, Blob } from '@google/genai';
import { Modality } from '@google/genai';
import { connectToLiveSession } from './services/geminiService';
import { ChatMessage as ChatMessageType, MessageRole } from './types';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

// Audio Encoding/Decoding Helpers
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      role: MessageRole.MODEL,
      text: "Hello there! I'm Radha. It's lovely to meet you. Click the microphone below to start our conversation!",
    },
  ]);
  const [session, setSession] = useState<Session | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  
  let nextStartTime = 0;
  const audioSources = useRef(new Set<AudioBufferSourceNode>());


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  const stopConversation = useCallback(() => {
    if (session) {
      session.close();
      setSession(null);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    audioSources.current.forEach(source => source.stop());
    audioSources.current.clear();
    setIsConnecting(false);
  }, [session]);

  const handleToggleConversation = useCallback(async () => {
    if (session) {
      stopConversation();
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const sessionPromise = connectToLiveSession({
        onopen: () => {
          setIsConnecting(false);
          console.debug('Session opened');
          
          // Fix: Cast window to 'any' to access vendor-prefixed webkitAudioContext
          inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          // Fix: Cast window to 'any' to access vendor-prefixed webkitAudioContext
          outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

          const source = inputAudioContextRef.current.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromise.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
          }
    
          if (message.serverContent?.turnComplete) {
            const finalUserInput = currentInputTranscription.current.trim();
            const finalModelOutput = currentOutputTranscription.current.trim();
            
            setMessages(prev => {
                const updatedMessages = [...prev];
                if(finalUserInput) updatedMessages.push({ role: MessageRole.USER, text: finalUserInput });
                if(finalModelOutput) updatedMessages.push({ role: MessageRole.MODEL, text: finalModelOutput });
                return updatedMessages;
            });

            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
          }
          
          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData && outputAudioContextRef.current) {
            nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
            const audioBuffer = await decodeAudioData(
              decode(audioData),
              outputAudioContextRef.current,
              24000,
              1,
            );
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);
            source.addEventListener('ended', () => {
              audioSources.current.delete(source);
            });
            source.start(nextStartTime);
            nextStartTime = nextStartTime + audioBuffer.duration;
            audioSources.current.add(source);
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error('Session error:', e);
          setError('An error occurred with the connection.');
          stopConversation();
        },
        onclose: (e: CloseEvent) => {
          console.debug('Session closed');
          stopConversation();
        },
      }, {
        // Fix: Removed incorrect nested 'config' object.
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Zephyr'}},
        },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      });
      setSession(await sessionPromise);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error('Failed to start session:', e);
      setError(`Failed to start conversation. ${errorMessage}`);
      setIsConnecting(false);
    }
  }, [session, stopConversation]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-gray-200 font-sans">
      <Header />
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-violet-950/20"
      >
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        {error && <div className="text-red-400 text-center p-2 rounded-md bg-red-950/50">{error}</div>}
      </div>
      <ChatInput 
        onToggleConversation={handleToggleConversation} 
        isConnecting={isConnecting}
        isSessionActive={!!session}
      />
    </div>
  );
};

export default App;
