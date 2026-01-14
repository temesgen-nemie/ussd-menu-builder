"use client";

import { useState, useRef, useEffect } from "react";
import { X, Smartphone, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { sendUssdRequest } from "../lib/api";

type Message = {
  content: string;
  type: "user" | "system";
  timestamp: Date;
};

type ResizablePhoneProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ResizablePhoneEmulator({ isOpen, onClose }: ResizablePhoneProps) {
  const [phoneNumber, setPhoneNumber] = useState("+251903193553");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sequenceNumber, setSequenceNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Drag and resize state
  const [position, setPosition] = useState({ 
    x: typeof window !== 'undefined' ? (window.innerWidth - 500) / 2 : 0, 
    y: typeof window !== 'undefined' ? (window.innerHeight - 600) / 2 : 100 
  });
  const [size, setSize] = useState({ width: 350, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const phoneRef = useRef<HTMLDivElement>(null);

  const generateSequenceNumber = () => {
    return Math.floor(Math.random() * 1000000);
  };

  // Determine if message is a USSD code (starts with * and ends with #)
  const isUssdCode = (message: string) => {
    return message.trim().startsWith('*') && message.trim().endsWith('#');
  };

  // Auto-determine service type
  const getServiceType = (message: string): "BR" | "CA" => {
    // If no session exists (no sequence number), it's a new session → BR
    if (!sequenceNumber) return "BR";
    
    // If message is a USSD code (like *7584#), it's a new session → BR
    if (isUssdCode(message)) return "BR";
    
    // Otherwise, continue existing session → CA
    return "CA";
  };

  const handleSend = async () => {
    if (!messageInput.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // Validate: if no session, must start with USSD code
    if (!sequenceNumber && !isUssdCode(messageInput)) {
      toast.error("Please start with a USSD code (e.g., *7584#)");
      return;
    }

    setIsLoading(true);

    const userMessage: Message = {
      content: messageInput,
      type: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Auto-determine service type
    const serviceType = getServiceType(messageInput);
    
    let currentSequence: number;
    if (serviceType === "BR") {
      // New session - generate new sequence number
      currentSequence = generateSequenceNumber();
      setSequenceNumber(currentSequence);
    } else {
      // Continue session - reuse existing sequence number
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
    <dest_addr>*675</dest_addr>
    <timestamp>${timestamp}</timestamp>
    <command_status>0</command_status>
    <data_coding>0</data_coding>
    <msg_len>${messageInput.length}</msg_len> 
    <IMSI>1234</IMSI>
    <msg_content>${messageInput}</msg_content>
</cps-message>`;

    try {
      const responseText = await sendUssdRequest(xmlRequest);
      const msgContentMatch = responseText.match(
        /<msg_content>([\s\S]*?)<\/msg_content>/
      );
      const responseContent = msgContentMatch
        ? msgContentMatch[1].trim()
        : "No response content";

      const systemMessage: Message = {
        content: responseContent,
        type: "system",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
      setMessageInput("");
    } catch (error) {
      console.error("USSD Request Error:", error);
      toast.error("Failed to send USSD request. Is the server running?");
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

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (phoneRef.current && !isResizing) {
      const rect = phoneRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isResizing) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        setSize({
          width: Math.max(350, resizeStart.width + deltaX),
          height: Math.max(500, resizeStart.height + deltaY),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart]);

  if (!isOpen) return null;

  return (
    <div
      ref={phoneRef}
      className="fixed z-[100] bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 rounded-3xl shadow-2xl overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Header - Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">USSD Simulator</h3>
            <p className="text-purple-200 text-xs">Seq: {sequenceNumber || "Not Started"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Phone Screen */}
      <div className="flex flex-col h-full bg-white" style={{ height: `calc(100% - 60px)` }}>
        {/* Config Bar */}
        <div className="bg-gray-50 border-b p-3 space-y-2">
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 font-medium"
            placeholder="Phone Number"
          />
          <button
            onClick={resetSession}
            className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
          >
            Reset Session
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-4">
              <div>
                <Smartphone className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Start a USSD session</p>
                <p className="text-xs mt-1">start with a USSD code (e.g., *123#)</p>
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
                  className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.type === "user"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm border border-gray-200"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap font-medium">
                    {msg.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      msg.type === "user"
                        ? "text-purple-200"
                        : "text-gray-500"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
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
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize group"
      >
        <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-purple-400 group-hover:border-purple-600 transition-colors"></div>
      </div>
    </div>
  );
}
