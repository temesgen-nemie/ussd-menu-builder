"use client";

import { useState } from "react";
import { sendUssdRequest } from "@/lib/api";

type Message = {
  content: string;
  type: "user" | "system";
  timestamp: Date;
  isOverLimit?: boolean;
  originalLength?: number;
  serviceType?: string;
};

export default function PhoneSessionPage() {
  const [phoneNumber, setPhoneNumber] = useState("+251910899167");
  const [shortCode, setShortCode] = useState("*675#");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sequenceNumber, setSequenceNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const generateSequenceNumber = () => Math.floor(Math.random() * 1000000);

  const isUssdCode = (message: string) =>
    message.trim().startsWith("*") && message.trim().endsWith("#");

  const getServiceType = (message: string): "BR" | "CA" => {
    if (!sequenceNumber) return "BR";
    if (isUssdCode(message)) return "BR";
    return "CA";
  };

  const handleSend = async () => {
    if (isLoading) return;
    if (!messageInput.trim()) {
      setRequestError("Please enter a message.");
      return;
    }

    if (!sequenceNumber && !isUssdCode(messageInput)) {
      setRequestError("Please start with a USSD code (e.g., *123#).");
      return;
    }

    setIsLoading(true);
    setRequestError(null);

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
        setRequestError(response.error || "Request failed.");
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
        serviceType: responseServiceType,
      };
      setMessages((prev) => [...prev, systemMessage]);
      setMessageInput("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const resetSession = () => {
    setMessages([]);
    setSequenceNumber(null);
    setMessageInput("");
    setRequestError(null);
  };

  return (
    <div className="bg-transparent text-white">
      <div className="bg-linear-to-br from-white/70 via-sky-100/50 to-blue-100/60 backdrop-blur-[1px] min-h-dvh">
        <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="rounded-2xl bg-[#1c1c1e] p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">USSD Session</div>
              <div className="mt-1 text-xs text-white/60">
                Seq: {sequenceNumber ?? "Not started"}
              </div>
            </div>
            <button
              onClick={resetSession}
              className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/20 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#1c1c1e] p-4 backdrop-blur">
          <label className="text-sm font-semibold">Phone Number</label>
          <input
            className="mt-2 w-full rounded-lg bg-white/5 p-2 text-sm text-white/60 outline-none placeholder:text-white/60"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-[#1c1c1e] p-4 shadow-2xl">
            {isLoading ? (
              <div className="flex min-h-15 items-center justify-center gap-4 text-center">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white/80" />
                <div className="text-sm font-semibold">USSD code running ...</div>
              </div>
            ) : requestError ? (
              <div className="flex min-h-15 flex-col items-center justify-center gap-4 text-center">
                <div className="text-sm font-semibold text-red-300">
                  {requestError}
                </div>
                <button
                  onClick={resetSession}
                  className="w-full py-3 text-sm font-semibold"
                >
                  OK
                </button>
              </div>
            ) : (
              <>
                <div className="min-h-30 max-h-35 overflow-auto pr-1 text-[14px] leading-5">
                  {messages.length === 0 ? (
                    <div className="text-sm font-semibold">
                      Enter USSD Code to start session (e.g. *123#)
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap min-h-16">
                      {messages[messages.length - 1].type === "system"
                        ? messages[messages.length - 1].content.substring(0, 172)
                        : "Enter Response"}
                    </div>
                  )}
                </div>

                {!(messages.length > 0 &&
                  messages[messages.length - 1].type === "system" &&
                  messages[messages.length - 1].serviceType === "EF") && (
                  <div className="mt-3">
                    <input
                      autoFocus
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="w-full border-b border-white/30 bg-transparent p-1 text-center text-lg text-white font-bold outline-none placeholder:text-white/60"
                    />
                  </div>
                )}

                <div className="mt-4">
                  {messages.length > 0 &&
                  messages[messages.length - 1].type === "system" &&
                  messages[messages.length - 1].serviceType === "EF" ? (
                    <button
                      onClick={resetSession}
                      className="w-full py-3 text-sm font-semibold"
                    >
                      OK
                    </button>
                  ) : (
                    <div className="grid grid-cols-2">
                      <button
                        onClick={resetSession}
                        className="py-3 text-sm text-white/80"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isLoading || !messageInput.trim()}
                        className="inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
