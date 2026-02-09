"use client";

import { useState, useRef, useEffect } from "react";
import { X, Smartphone, Wifi, Signal, Battery } from "lucide-react";
import { toast } from "sonner";
import { sendUssdRequest } from "../lib/api";
import Draggable from "react-draggable";

type Message = {
  content: string;
  type: "user" | "system";
  timestamp: Date;
  isOverLimit?: boolean;
  originalLength?: number;
  serviceType?: string;
};

type ResizablePhoneProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ResizablePhoneEmulator({
  isOpen,
  onClose,
}: ResizablePhoneProps) {
  const [phoneNumber, setPhoneNumber] = useState("+251910899167");
  const [shortCode, setShortCode] = useState("*675#");
  const [viewMode, setViewMode] = useState<'classic' | 'real'>('real');
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sequenceNumber, setSequenceNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const nodeRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const generateSequenceNumber = () => {
    return Math.floor(Math.random() * 1000000);
  };

  const isUssdCode = (message: string) => {
    return message.trim().startsWith("*") && message.trim().endsWith("#");
  };

  const getServiceType = (message: string): "BR" | "CA" => {
    if (!sequenceNumber) return "BR";
    if (isUssdCode(message)) return "BR";
    return "CA";
  };

  const handleSend = async () => {
    if (!messageInput.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!sequenceNumber && !isUssdCode(messageInput)) {
      toast.error("Please start with a USSD code (e.g., *123#)");
      return;
    }

    setIsLoading(true);

    const userMessage: Message = {
      content: messageInput,
      type: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const serviceType = getServiceType(messageInput);
    let effectiveShortCode = shortCode;
    if (serviceType === "BR" && isUssdCode(messageInput)) {
      effectiveShortCode = messageInput.trim();
      setShortCode(effectiveShortCode);
    }

    let currentSequence: number;
    if (serviceType === "BR") {
      currentSequence = generateSequenceNumber();
      setSequenceNumber(currentSequence);
    } else {
      currentSequence = sequenceNumber || generateSequenceNumber();
      if (!sequenceNumber) setSequenceNumber(currentSequence);
    }

    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 19)
      .replace(/-/g, "/");

    const xmlRequest = `<cps-message>
    <sequence_number>${currentSequence}</sequence_number>
    <version>32</version>  
    <service_type>${serviceType}</service_type> 
    <source_addr>${phoneNumber}</source_addr>
    <dest_addr>${effectiveShortCode}</dest_addr>
    <timestamp>${timestamp}</timestamp>
    <command_status>0</command_status>
    <data_coding>0</data_coding>
    <msg_len>${messageInput.length}</msg_len> 
    <IMSI>1234</IMSI>
    <msg_content>${messageInput}</msg_content>
</cps-message>`;

    try {
      const response = await sendUssdRequest(xmlRequest);
      if (!response.ok) {
        toast.error(response.error || "Failed to send USSD request.");
        return;
      }
      
      const msgContentMatch = response.data.match(
        /<msg_content>([\s\S]*?)<\/msg_content>/
      );
      const responseContent = msgContentMatch
        ? msgContentMatch[1].trim()
        : "No response content";

      const serviceTypeMatch = response.data.match(
        /<service_type>([\s\S]*?)<\/service_type>/
      );
      const responseServiceType = serviceTypeMatch
        ? serviceTypeMatch[1].trim()
        : "CA";

      const systemMessage: Message = {
        content: responseContent,
        type: "system",
        timestamp: new Date(),
        isOverLimit: responseContent.length > 172,
        originalLength: responseContent.length,
        serviceType: responseServiceType
      };
      setMessages((prev) => [...prev, systemMessage]);
      setMessageInput("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetSession = () => {
    setMessages([]);
    setSequenceNumber(null);
    setMessageInput("");
    toast.success("Session reset");
  };

  if (!isOpen) return null;

  return (
    <Draggable 
      handle=".phone-frame" 
      nodeRef={nodeRef}
      defaultPosition={{
        x: 40,
        y: typeof window !== "undefined" ? (window.innerHeight - 600) / 2 : 50
      }}
    >
      <div 
        ref={nodeRef}
        className="fixed z-[100] top-0 left-0"
      >
        {/* Phone Frame - Height 580px */}
        <div className="phone-frame group relative w-[350px] h-[580px] bg-black rounded-[3rem] p-2.5 shadow-2xl border-[5px] border-[#1a1a1a] cursor-grab active:cursor-grabbing transform transition-transform hover:scale-[1.01]">
          
          {/* Mute Switch Side Button */}
          <div className="absolute -left-[6px] top-16 w-1 h-8 bg-[#1a1a1a] rounded-l-md" />
          {/* Volume Buttons */}
          <div className="absolute -left-[6px] top-28 w-1 h-10 bg-[#1a1a1a] rounded-l-md" />
          <div className="absolute -left-[6px] top-40 w-1 h-10 bg-[#1a1a1a] rounded-l-md" />
          {/* Power Button */}
          <div className="absolute -right-[6px] top-32 w-1 h-14 bg-[#1a1a1a] rounded-r-md" />

          {/* Screen */}
          <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col shadow-inner">
            
            {/* Status Bar - Purple background in both modes */}
            <div className="h-6 px-8 flex items-center justify-between bg-purple-600 text-white font-semibold text-[10px] select-none z-20">
              <div className="flex-1 opacity-80">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
              
              {/* Dynamic Island */}
              <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-20 h-4 bg-black rounded-full flex items-center justify-center gap-1.5 z-10 shadow-lg">
                <div className="w-1 h-1 rounded-full bg-[#1a1a1a]" />
                <div className="w-2.5 h-1 rounded-full bg-[#1a1a1a]" />
              </div>

              <div className="flex items-center gap-1 opacity-80">
                <Signal className="h-2.5 w-2.5" strokeWidth={2.5} />
                <Wifi className="h-2.5 w-2.5" strokeWidth={2.5} />
                <Battery className="h-3 w-3" strokeWidth={2.5} />
              </div>
            </div>

            {viewMode === 'classic' ? (
              <>
                {/* Classic UI: Purple Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">USSD Simulator</h3>
                      <p className="text-purple-200 text-xs">
                        Seq: {sequenceNumber || "Not Started"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('real')}
                      className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md font-bold transition-colors"
                    >
                      Real Mode
                    </button>
                    <button
                      onClick={onClose}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Classic UI: Config Bar */}
                <div className="bg-gray-50 border-b p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                      Phone No:
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 font-medium bg-white"
                      placeholder="e.g. +251..."
                    />
                  </div>
                  <button
                    onClick={resetSession}
                    className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                  >
                    Reset Session
                  </button>
                </div>

                {/* Classic UI: Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white no-scrollbar">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-4">
                      <div>
                        <Smartphone className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>Start a USSD session</p>
                        <p className="text-xs mt-1">
                          start with a USSD code (e.g., *123#)
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          msg.type === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          title={msg.isOverLimit ? `Message exceeds USSD limit of 172 characters. Current: ${msg.originalLength}. This will be truncated by a real gateway.` : ""}
                          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                            msg.type === "user"
                              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-sm"
                              : msg.isOverLimit 
                                ? "bg-red-50 text-red-900 rounded-bl-sm border border-red-200"
                                : "bg-white text-gray-800 rounded-bl-sm border border-gray-200"
                          }`}
                        >
                          <div className={`text-sm whitespace-pre-wrap font-medium break-all ${msg.isOverLimit && msg.type === "system" ? "text-gray-900" : ""}`}>
                            {msg.type === "system" && msg.isOverLimit ? (
                              <>
                                <span>{msg.content.substring(0, 172)}</span>
                                <span className="text-red-600 bg-red-50">{msg.content.substring(172)}</span>
                              </>
                            ) : (
                              msg.content
                            )}
                          </div>
                          <div
                            className={`text-[10px] mt-1 flex justify-between items-center gap-4 ${
                              msg.type === "user" ? "text-purple-200" : msg.isOverLimit ? "text-red-400" : "text-gray-500"
                            }`}
                          >
                            <span> {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',second: '2-digit'})} </span>

                            {msg.type === "system" && (
                              <span className={`font-mono ${msg.isOverLimit ? "bg-red-100 px-1 rounded" : "opacity-50"}`}>
                                {msg.originalLength}/172
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Classic UI: Input Area */}
                <div className="border-t bg-white p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={isLoading}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 text-gray-900 font-medium placeholder:text-gray-400 text-sm"
                    />
                    <button
                      onClick={handleSend}
                      disabled={isLoading || !messageInput.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-md"
                    >
                      {isLoading ? "..." : "Send"}
                    </button>
                  </div>
                  {/* Home Indication bar */}
                  <div className="w-24 h-1 bg-black/10 rounded-full mx-auto mt-4 mb-0.5" />
                </div>
              </>
            ) : (
              /* Initial Real Mode UI: Dark Theme with Wallpaper */
              <div 
                className="relative flex-1 flex flex-col overflow-hidden"
                style={{
                  backgroundImage: `url('/api/brain/3577d62b-732d-4b51-a4ab-74dffb770d8e/phone_wallpaper_abstract_1768641889344.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* Real Mode: Purple Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between relative z-30">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">USSD Simulator</h3>
                      <p className="text-purple-200 text-xs">
                        Seq: {sequenceNumber || "Not Started"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('classic')}
                      className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md font-bold transition-colors"
                    >
                      Chat Mode
                    </button>
                    <button
                      onClick={onClose}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Real Mode: Config Bar */}
                <div className="bg-gray-50 border-b p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                      Phone No:
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 font-medium bg-white"
                      placeholder="e.g. +251..."
                    />
                  </div>
                  <button
                    onClick={resetSession}
                    className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                  >
                    Reset Session
                  </button>
                </div>

                {/* Real Mode: Popup Container */}
                <div className="flex-1 relative flex items-center justify-center p-4">
                  {isLoading ? (
                    /* Real Mode: Loading State */
                    <div className="w-full bg-white/90 backdrop-blur-2xl rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-4 border border-white animate-in zoom-in-95 duration-200">
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                      <p className="text-gray-900 font-bold text-lg tracking-tight">USSD code running...</p>
                    </div>
                  ) : (
                    /* Real Mode: Main Popup - Original Dark Theme */
                    <div className="w-full bg-[#1c1c1e] rounded-[1.8rem] overflow-hidden shadow-2xl text-white animate-in zoom-in-95 duration-200">
                      {/* Popup Content */}
                      <div className="p-4 flex flex-col min-h-0">
                        {/* Scrollable Message Content */}
                        <div className={`overflow-hidden pr-2 ${
                          messages.length > 0 && messages[messages.length-1].serviceType === 'EF' 
                            ? 'max-h-[240px] mb-2' 
                            : 'max-h-[180px] mb-3'
                        }`}>
                          <p className={`font-medium leading-[1.25] select-none whitespace-pre-wrap text-left break-words max-w-full ${
                            messages.length > 0 && messages[messages.length - 1].type === 'system'
                              ? messages[messages.length - 1].content.length > 160
                                ? "text-[10px]"
                                : messages[messages.length - 1].content.length > 130
                                  ? "text-[11px]"
                                  : messages[messages.length - 1].content.length > 100
                                    ? "text-[12px]"
                                    : messages[messages.length - 1].content.length > 70
                                      ? "text-[13px]"
                                      : "text-[14.5px]"
                              : "text-[14.5px]"
                          }`}>
                            {messages.length > 0 
                              ? messages[messages.length - 1].type === 'system' 
                                 ? messages[messages.length - 1].content.substring(0, 172)
                                 : "Enter Response"
                              : "Enter USSD Code to start session (e.g. *123#)"}
                          </p>
                        </div>

                        <style jsx>{`
                          .custom-scrollbar::-webkit-scrollbar {
                            width: 4px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-track {
                            background: rgba(255, 255, 255, 0.04);
                            border-radius: 10px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.15);
                            border-radius: 10px;
                          }
                        `}</style>
                        
                        {/* Underline Input Area - Hidden if EF */}
                        {!(messages.length > 0 && messages[messages.length - 1].type === 'system' && messages[messages.length - 1].serviceType === 'EF') && (
                          <div className="w-full relative group">
                            <input 
                              autoFocus
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              onKeyPress={handleKeyPress}
                              className="w-full bg-transparent text-center text-xl font-normal outline-none border-b border-white/20 focus:border-white transition-colors pb-1"
                            />
                          </div>
                        )}
                      </div>

                      {/* Popup Actions */}
                      <div className="border-t border-white/10">
                        {messages.length > 0 && messages[messages.length - 1].type === 'system' && messages[messages.length - 1].serviceType === 'EF' ? (
                          <button 
                            onClick={resetSession}
                            className="w-full py-4 text-[17px] font-semibold text-white hover:bg-white/5 transition-colors active:opacity-50"
                          >
                            OK
                          </button>
                        ) : (
                          <div className="grid grid-cols-2">
                            <button 
                              onClick={resetSession}
                              className="py-4 text-[17px] font-semibold text-white/90 hover:bg-white/5 transition-colors border-r border-white/10 active:opacity-50"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleSend}
                              disabled={!messageInput.trim()}
                              className="py-4 text-[17px] font-semibold text-white hover:bg-white/5 transition-colors active:opacity-50 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Home Indication bar - Common */}
                <div className={`z-20 w-24 h-1 bg-black/10 rounded-full mx-auto mt-4 mb-0.5 ${viewMode === 'real' ? 'bg-white/20' : ''}`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Draggable>
  );
}
