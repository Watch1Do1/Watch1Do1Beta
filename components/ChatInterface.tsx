
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '../types';
import { createProjectAssistantChat } from '../services/geminiService';
import { SendIcon, SparkleIcon, MessageCircleIcon, RefreshCwIcon, LinkIcon, CopyIcon, UserIcon, CheckCircleIcon, ChevronDownIcon } from './IconComponents';
import { Chat, GenerateContentResponse, GroundingChunk as GeminiGroundingChunk } from '@google/genai';

interface ChatInterfaceProps {
  videoTitle: string;
  products: Product[];
  trackEvent?: (eventName: string, props: any) => void;
  videoId?: number;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  groundingSources?: GeminiGroundingChunk[];
}

const SUGGESTED_PROMPTS = [
    "What is the total project cost?",
    "Any specific safety precautions?",
    "Cheaper alternatives for parts?",
    "Expert tips for this build?"
];

/**
 * Sub-component for individual message bubbles to manage internal "Show More" state
 */
const ChatBubble: React.FC<{ 
    msg: Message; 
    isGrouped: boolean; 
    isLast: boolean; 
    isLoading: boolean;
    onCopy: (text: string) => void;
    isCopied: boolean;
    onRetry: () => void;
}> = ({ msg, isGrouped, isLast, isLoading, onCopy, isCopied, onRetry }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLong = msg.text.length > 450;
    const displayText = (isLong && !isExpanded) ? msg.text.slice(0, 450) + '...' : msg.text;

    return (
        <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-1' : 'mt-6'}`}>
            {/* Avatar - Only show if not grouped */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm transition-opacity ${isGrouped ? 'opacity-0' : 'opacity-100'} ${msg.role === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-[#7D8FED]/10 border-[#7D8FED]/20'}`}>
                {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-slate-400" /> : <SparkleIcon className="w-4 h-4 text-[#7D8FED]" />}
            </div>

            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`relative group px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                    msg.role === 'user' 
                    ? 'bg-[#7D8FED] text-white rounded-tr-none' 
                    : 'bg-slate-700 text-slate-200 rounded-tl-none border border-slate-600/50'
                } ${isGrouped ? (msg.role === 'user' ? 'rounded-tr-2xl' : 'rounded-tl-2xl') : ''}`}>
                    
                    <div className="whitespace-pre-wrap">
                        {displayText || (isLoading && msg.role === 'model' && (
                            <div className="flex items-center gap-3 py-1">
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 bg-[#7D8FED] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1 h-1 bg-[#7D8FED] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1 h-1 bg-[#7D8FED] rounded-full animate-bounce"></div>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Syncing...</span>
                            </div>
                        ))}
                    </div>

                    {isLong && (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mt-2 text-[10px] font-black text-[#7D8FED] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                        >
                            {isExpanded ? 'Show Less' : 'Read Full Instructions'}
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                    
                    {msg.role === 'model' && msg.text && (
                        <button 
                            onClick={() => onCopy(msg.text)}
                            className="absolute -right-10 top-0 p-2 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/50 rounded-lg border border-slate-700"
                            title="Copy to clipboard"
                        >
                            {isCopied ? <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {/* Grounding Reference UI */}
                    {msg.groundingSources && msg.groundingSources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-600/30">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <LinkIcon className="w-3.5 h-3.5" /> Source Library
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.groundingSources.map((chunk, i) => chunk.web?.uri && (
                            <a 
                              key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-[#7D8FED] transition-all"
                            >
                              <div className="w-6 h-6 bg-slate-950 rounded flex items-center justify-center flex-shrink-0">
                                <img src={`https://www.google.com/s2/favicons?domain=${new URL(chunk.web.uri).hostname}`} className="w-3 h-3" alt="" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 truncate">
                                {chunk.web.title || chunk.web.uri}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
                
                {!isGrouped && (
                    <div className="mt-1.5 flex items-center gap-3 px-1">
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">{msg.timestamp}</span>
                        {msg.role === 'model' && isLast && !isLoading && (
                            <button 
                                onClick={onRetry}
                                className="text-[9px] font-black text-[#7D8FED] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                            >
                                <RefreshCwIcon className="w-2.5 h-2.5" /> Retry Turn
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ videoTitle, products, trackEvent, videoId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const chatRef = useRef<Chat | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoize product signature to avoid re-init if the array reference changes but content doesn't
  const productSignature = useMemo(() => JSON.stringify(products.map(p => p.name)), [products]);

  const getTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const initChat = () => {
    chatRef.current = createProjectAssistantChat(videoTitle, products);
    
    // Personalized Welcome
    const kitSample = products.map(p => p.name).slice(0, 2).join(' and ');
    const welcome = `Hi! I'm your build assistant for "${videoTitle}". I've analyzed the ${products.length} items in this kit, including the ${kitSample}. How can I help your project today?`;

    setMessages([{
        role: 'model',
        text: welcome,
        timestamp: getTimestamp()
    }]);
    if (trackEvent) trackEvent('chat_init', { videoId });
  };

  useEffect(() => {
    initChat();
    setTimeout(() => textareaRef.current?.focus(), 200);
  }, [videoTitle, productSignature]); 

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopy = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSend = async (customMessage?: string) => {
    const userMessage = customMessage || input.trim();
    if (!userMessage || isLoading || !chatRef.current) return;

    const time = getTimestamp();
    if (!customMessage) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', text: userMessage, timestamp: time }]);
    setIsLoading(true);

    if (trackEvent) trackEvent('chat_message_sent', { videoId, messageLength: userMessage.length });

    try {
      const result = await chatRef.current.sendMessageStream({ message: userMessage });
      
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: getTimestamp() }]);
      
      let fullText = '';

      for await (const chunk of result) {
          const c = chunk as GenerateContentResponse;
          const textDelta = c.text || '';
          fullText += textDelta;
          
          setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage?.role === 'model') {
                  lastMessage.text = fullText;
                  if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    lastMessage.groundingSources = c.candidates[0].groundingMetadata.groundingChunks as GeminiGroundingChunk[];
                  }
              }
              return newMessages;
          });
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorText = "I'm having trouble connecting to the workshop brain. Please check your connection.";
      if (error?.message?.includes('429')) {
          errorText = "The workshop assistant is currently in high demand. Please try again in a few moments.";
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: errorText, 
        timestamp: getTimestamp() 
      }]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleRetry = () => {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
          setMessages(prev => {
              const cleaned = [...prev];
              if (cleaned[cleaned.length - 1].role === 'model') cleaned.pop();
              return cleaned;
          });
          handleSend(lastUserMsg.text);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
  };

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      <div ref={scrollContainerRef} className="flex-grow overflow-y-auto space-y-1 pr-2 mb-4 custom-scrollbar">
        {messages.map((msg, index) => {
            const isGrouped = index > 0 && messages[index - 1].role === msg.role;
            const isLast = index === messages.length - 1;
            
            return (
                <ChatBubble 
                    key={index}
                    msg={msg}
                    isGrouped={isGrouped}
                    isLast={isLast}
                    isLoading={isLoading && isLast}
                    onCopy={(text) => handleCopy(text, index)}
                    isCopied={copiedIndex === index}
                    onRetry={handleRetry}
                />
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 mt-auto space-y-4">
        {/* Suggested Prompt Chips - Only show when input is empty */}
        {input.trim() === '' && !isLoading && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
                {SUGGESTED_PROMPTS.map(prompt => (
                    <button 
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:border-[#7D8FED] hover:text-[#7D8FED] transition-all hover:bg-slate-700"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        )}

        <div className={`relative transition-all ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? "Analyzing project data..." : "Ask about tools, techniques, or safety..."}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-6 pr-16 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#7D8FED] focus:ring-4 focus:ring-[#7D8FED]/5 shadow-inner transition-all resize-none overflow-hidden max-h-32"
              style={{ height: 'auto' }}
              onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
              aria-label="Ask the build assistant"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2.5 bg-[#7D8FED] text-white rounded-xl hover:bg-[#6b7ae6] disabled:opacity-30 transition-all shadow-lg active:scale-90"
            >
              <SendIcon className="w-5 h-5" />
            </button>
        </div>
        <p className="text-[8px] text-center text-slate-600 font-bold uppercase tracking-widest px-4">
            Assistant uses Vision AI to analyze build steps. Verify critical measurements.
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
