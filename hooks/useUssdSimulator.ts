"use client";

import { useEffect, useState } from "react";
import { sendUssdRequest } from "@/lib/api";
import { useSettingsStore } from "@/store/settingsStore";

export type Message = {
  content: string;
  type: "user" | "system";
  timestamp: Date;
  isOverLimit?: boolean;
  originalLength?: number;
  serviceType?: string;
};

type UseUssdSimulatorOptions = {
  initialPhone?: string;
  initialShortCode?: string;
  onError?: (message: string) => void;
  onReset?: () => void;
};

const DEFAULT_PHONE = "+251979458662";
const DEFAULT_SHORT_CODE = "*675#";

export function useUssdSimulator(options: UseUssdSimulatorOptions = {}) {
  const initialPhone = options.initialPhone ?? DEFAULT_PHONE;
  const initialShortCode = options.initialShortCode ?? DEFAULT_SHORT_CODE;

  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [shortCode, setShortCode] = useState(initialShortCode);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sequenceNumber, setSequenceNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const defaultPhone = useSettingsStore(
    (s) => s.defaultPhoneNumberByFlow["global"] ?? "",
  );

  useEffect(() => {
    setPhoneNumber(defaultPhone || initialPhone);
  }, [defaultPhone, initialPhone]);

  const generateSequenceNumber = () => Math.floor(Math.random() * 1_000_000);

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
      const message = "Please enter a message";
      setRequestError(message);
      options.onError?.(message);
      return;
    }

    if (!sequenceNumber && !isUssdCode(messageInput)) {
      const message = "Please start with a USSD code (e.g., *123#)";
      setRequestError(message);
      options.onError?.(message);
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

    const isSafaricomFormat = phoneNumber.startsWith("+2517");
    let xmlRequest: string;

    if (isSafaricomFormat) {
      const numericType = serviceType === "BR" ? "1" : "2";
      xmlRequest = `<ussd>
    <msisdn>${phoneNumber}</msisdn>
    <sessionid>${currentSequence}</sessionid>
    <type>${numericType}</type>
    <msg>${messageInput}</msg>
</ussd>`;
    } else {
      const xmlShortCode = effectiveShortCode.endsWith("#")
        ? effectiveShortCode.slice(0, -1)
        : effectiveShortCode;

      xmlRequest = `<cps-message>
    <sequence_number>${currentSequence}</sequence_number>
    <version>32</version>
    <service_type>${serviceType}</service_type>
    <source_addr>${phoneNumber}</source_addr>
    <dest_addr>${xmlShortCode}</dest_addr>
    <timestamp>${timestamp}</timestamp>
    <command_status>0</command_status>
    <data_coding>0</data_coding>
    <msg_len>${messageInput.length}</msg_len>
    <IMSI>1234</IMSI>
    <msg_content>${messageInput}</msg_content>
</cps-message>`;
    }

    try {
      const response = await sendUssdRequest(xmlRequest);
      if (!response.ok) {
        const message = response.error || "Failed to send USSD request.";
        setRequestError(message);
        options.onError?.(message);
        return;
      }

      let responseContent = "No response content";
      let responseServiceType = "CA";

      if (isSafaricomFormat) {
        const msgMatch = response.data.match(/<msg>([\s\S]*?)<\/msg>/);
        const typeMatch = response.data.match(/<type>([\s\S]*?)<\/type>/);

        if (msgMatch) responseContent = msgMatch[1].trim();

        if (typeMatch) {
          const typeValue = typeMatch[1].trim();
          if (typeValue === "3") responseServiceType = "EF";
          else if (typeValue === "1") responseServiceType = "BR";
          else responseServiceType = "CA";
        }
      } else {
        const msgContentMatch = response.data.match(
          /<msg_content>([\s\S]*?)<\/msg_content>/,
        );
        responseContent = msgContentMatch
          ? msgContentMatch[1].trim()
          : "No response content";

        const serviceTypeMatch = response.data.match(
          /<service_type>([\s\S]*?)<\/service_type>/,
        );
        responseServiceType = serviceTypeMatch
          ? serviceTypeMatch[1].trim()
          : "CA";
      }

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

  const resetSession = () => {
    setMessages([]);
    setSequenceNumber(null);
    setMessageInput("");
    setRequestError(null);
    options.onReset?.();
  };

  return {
    phoneNumber,
    setPhoneNumber,
    shortCode,
    setShortCode,
    messageInput,
    setMessageInput,
    messages,
    sequenceNumber,
    isLoading,
    requestError,
    handleSend,
    resetSession,
  };
}
