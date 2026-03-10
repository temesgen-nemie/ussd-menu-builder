"use client";

import { useEffect, useRef, useState } from "react";
import { sendUssdRequest } from "@/lib/api";
import { useSettingsStore } from "@/store/settingsStore";
import {
  PersistedSimulatorMessage,
  ReplayTrailStep,
  useSimulatorStore,
} from "@/store/simulatorStore";

export type Message = {
  content: string;
  type: "user" | "system";
  timestamp: Date;
  isOverLimit?: boolean;
  originalLength?: number;
  serviceType?: string;
};

export type UseUssdSimulatorReturn = {
  phoneNumber: string;
  setPhoneNumber: React.Dispatch<React.SetStateAction<string>>;
  shortCode: string;
  setShortCode: React.Dispatch<React.SetStateAction<string>>;
  messageInput: string;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  messages: Message[];
  sequenceNumber: number | null;
  isLoading: boolean;
  requestError: string | null;
  replayTrailCount: number;
  hasReplayData: boolean;
  replayState: ReplayState;
  hasDefaultDial: boolean;
  handleSend: () => Promise<void>;
  resetSession: () => void;
  startReplay: () => Promise<void>;
  pauseReplay: () => void;
  resumeReplay: () => void;
  stopReplay: () => void;
  clearReplayTrail: () => void;
  dialDefaultFlow: () => Promise<void>;
};

type UseUssdSimulatorOptions = {
  initialPhone?: string;
  initialShortCode?: string;
  onError?: (message: string) => void;
  onReset?: () => void;
  replayDelayMs?: number;
};

const DEFAULT_PHONE = "+251979458662";
const DEFAULT_SHORT_CODE = "*675#";

type ReplayStatus = "idle" | "running" | "paused" | "stopped" | "completed" | "error";

type ReplayState = {
  status: ReplayStatus;
  currentStep: number;
  totalSteps: number;
  error: string | null;
};

export function useUssdSimulator(
  options: UseUssdSimulatorOptions = {}
): UseUssdSimulatorReturn {
  const initialPhone = options.initialPhone ?? DEFAULT_PHONE;
  const initialShortCode = options.initialShortCode ?? DEFAULT_SHORT_CODE;
  const replayDelayMs = options.replayDelayMs ?? 500;
  const replayPreviewDelayMs = 700;
  const dialPreviewDelayMs = 600;

  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [shortCode, setShortCode] = useState(initialShortCode);
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sequenceNumber, setSequenceNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [replayTrail, setReplayTrail] = useState<ReplayTrailStep[]>([]);
  const [replayState, setReplayState] = useState<ReplayState>({
    status: "idle",
    currentStep: 0,
    totalSteps: 0,
    error: null,
  });

  const defaultPhone = useSettingsStore(
    (s) => s.defaultPhoneNumberByFlow["global"] ?? "",
  );
  const defaultFlowName = useSettingsStore((s) => s.defaultFlowName);
  const defaultFlowShortcodes = useSettingsStore((s) => s.defaultFlowShortcodes);
  const lastSession = useSimulatorStore((s) => s.lastSession);
  const hasHydratedSession = useSimulatorStore((s) => s.hasHydrated);
  const saveSession = useSimulatorStore((s) => s.saveSession);
  const clearSavedSession = useSimulatorStore((s) => s.clearSession);

  const hasRestoredSessionRef = useRef(false);
  const stopReplayRef = useRef(false);
  const pauseReplayRef = useRef(false);
  const messageRef = useRef(messages);
  const replayTrailRef = useRef(replayTrail);
  const sequenceRef = useRef(sequenceNumber);
  const shortCodeRef = useRef(shortCode);
  const phoneRef = useRef(phoneNumber);

  useEffect(() => {
    messageRef.current = messages;
  }, [messages]);

  useEffect(() => {
    replayTrailRef.current = replayTrail;
  }, [replayTrail]);

  useEffect(() => {
    sequenceRef.current = sequenceNumber;
  }, [sequenceNumber]);

  useEffect(() => {
    shortCodeRef.current = shortCode;
  }, [shortCode]);

  useEffect(() => {
    phoneRef.current = phoneNumber;
  }, [phoneNumber]);

  useEffect(() => {
    if (hasRestoredSessionRef.current) return;
    setPhoneNumber(defaultPhone || initialPhone);
  }, [defaultPhone, initialPhone]);

  useEffect(() => {
    if (!hasHydratedSession || hasRestoredSessionRef.current) return;
    hasRestoredSessionRef.current = true;
    if (!lastSession) return;

    setPhoneNumber(lastSession.phoneNumber || initialPhone);
    phoneRef.current = lastSession.phoneNumber || initialPhone;
    setShortCode(lastSession.shortCode || initialShortCode);
    shortCodeRef.current = lastSession.shortCode || initialShortCode;
    setSequenceNumber(lastSession.sequenceNumber);
    sequenceRef.current = lastSession.sequenceNumber;

    const restoredMessages: Message[] = (lastSession.messages || []).map((msg) => ({
      content: msg.content,
      type: msg.type,
      timestamp: new Date(msg.timestampMs),
      isOverLimit: msg.isOverLimit,
      originalLength: msg.originalLength,
      serviceType: msg.serviceType,
    }));
    setMessages(restoredMessages);
    messageRef.current = restoredMessages;

    const restoredTrail = Array.isArray(lastSession.replayTrail) ? lastSession.replayTrail : [];
    setReplayTrail(restoredTrail);
    replayTrailRef.current = restoredTrail;
  }, [hasHydratedSession, initialPhone, initialShortCode, lastSession]);

  const generateSequenceNumber = () => Math.floor(Math.random() * 1_000_000);

  const isUssdCode = (message: string) =>
    message.trim().startsWith("*") && message.trim().endsWith("#");

  const getServiceType = (message: string): "BR" | "CA" => {
    if (!sequenceRef.current) return "BR";
    if (isUssdCode(message)) return "BR";
    return "CA";
  };

  const getCarrierFromPhone = (value: string): "tele" | "safari" | null => {
    const normalized = value.replace(/\s+/g, "").trim();
    if (normalized.startsWith("+2517") || normalized.startsWith("07")) return "safari";
    if (normalized.startsWith("+2519") || normalized.startsWith("09")) return "tele";
    return null;
  };

  const toPersistedMessages = (data: Message[]): PersistedSimulatorMessage[] =>
    data.map((msg) => ({
      content: msg.content,
      type: msg.type,
      timestampMs: msg.timestamp.getTime(),
      isOverLimit: msg.isOverLimit,
      originalLength: msg.originalLength,
      serviceType: msg.serviceType,
    }));

  const persistSnapshot = (
    nextMessages: Message[],
    nextReplayTrail: ReplayTrailStep[],
    nextSequence: number | null,
    nextShortCode: string
  ) => {
    saveSession({
      phoneNumber: phoneRef.current,
      shortCode: nextShortCode,
      sequenceNumber: nextSequence,
      messages: toPersistedMessages(nextMessages),
      replayTrail: nextReplayTrail,
      lastUpdatedAtMs: Date.now(),
    });
  };

  const sendInput = async (input: string, opts?: { recordTrail?: boolean }) => {
    setIsLoading(true);
    setRequestError(null);

    const userMessage: Message = {
      content: input,
      type: "user",
      timestamp: new Date(),
    };
    const messagesAfterUser = [...messageRef.current, userMessage];
    messageRef.current = messagesAfterUser;
    setMessages(messagesAfterUser);

    const serviceType = getServiceType(input);
    let effectiveShortCode = shortCodeRef.current;
    if (serviceType === "BR" && isUssdCode(input)) {
      effectiveShortCode = input.trim();
      setShortCode(effectiveShortCode);
      shortCodeRef.current = effectiveShortCode;
    }

    let currentSequence: number;
    if (serviceType === "BR") {
      currentSequence = generateSequenceNumber();
      setSequenceNumber(currentSequence);
      sequenceRef.current = currentSequence;
    } else {
      currentSequence = sequenceRef.current || generateSequenceNumber();
      if (!sequenceRef.current) {
        setSequenceNumber(currentSequence);
        sequenceRef.current = currentSequence;
      }
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
    <msisdn>${phoneRef.current}</msisdn>
    <sessionid>${currentSequence}</sessionid>
    <type>${numericType}</type>
    <msg>${input}</msg>
</ussd>`;
    } else {
      const xmlShortCode = effectiveShortCode.endsWith("#")
        ? effectiveShortCode.slice(0, -1)
        : effectiveShortCode;

      xmlRequest = `<cps-message>
    <sequence_number>${currentSequence}</sequence_number>
    <version>32</version>
    <service_type>${serviceType}</service_type>
    <source_addr>${phoneRef.current}</source_addr>
    <dest_addr>${xmlShortCode}</dest_addr>
    <timestamp>${timestamp}</timestamp>
    <command_status>0</command_status>
    <data_coding>0</data_coding>
    <msg_len>${input.length}</msg_len>
    <IMSI>1234</IMSI>
    <msg_content>${input}</msg_content>
</cps-message>`;
    }

    try {
      const response = await sendUssdRequest(xmlRequest);
      if (!response.ok) {
        const message = response.error || "Failed to send USSD request.";
        setRequestError(message);
        options.onError?.(message);
        return { ok: false as const, error: message };
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
      const messagesAfterResponse = [...messageRef.current, systemMessage];
      messageRef.current = messagesAfterResponse;
      setMessages(messagesAfterResponse);
      setMessageInput("");

      const shouldRecordTrail = opts?.recordTrail !== false;
      const nextTrail = shouldRecordTrail
        ? [
            ...replayTrailRef.current,
            {
              input,
              expectedResponse: responseContent,
              responseServiceType,
              timestampMs: Date.now(),
            },
          ]
        : replayTrailRef.current;

      if (shouldRecordTrail) {
        replayTrailRef.current = nextTrail;
        setReplayTrail(nextTrail);
      }

      persistSnapshot(messagesAfterResponse, nextTrail, currentSequence, effectiveShortCode);
      return {
        ok: true as const,
        systemMessage,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send USSD request.";
      setRequestError(message);
      options.onError?.(message);
      return { ok: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeMessage = (value: string) =>
    value.toLowerCase().replace(/\s+/g, " ").trim();

  const isResponseMatch = (expected: string, actual: string) => {
    if (!expected) return true;
    const exp = normalizeMessage(expected);
    const act = normalizeMessage(actual);
    if (exp === act || act.includes(exp) || exp.includes(act)) return true;
    const prefix = exp.slice(0, Math.min(32, exp.length));
    return prefix.length > 0 && act.includes(prefix);
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(() => resolve(), ms);
    });

  const waitWhilePaused = async () => {
    while (pauseReplayRef.current && !stopReplayRef.current) {
      await wait(120);
    }
  };

  const handleSend = async () => {
    if (isLoading) return;
    if (!messageInput.trim()) {
      const message = "Please enter a message";
      setRequestError(message);
      options.onError?.(message);
      return;
    }

    if (!sequenceRef.current && !isUssdCode(messageInput)) {
      const message = "Please start with a USSD code (e.g., *123#)";
      setRequestError(message);
      options.onError?.(message);
      return;
    }

    await sendInput(messageInput.trim(), { recordTrail: true });
  };

  const dialDefaultFlow = async () => {
    if (isLoading) return;
    if (!defaultFlowName) {
      const message = "No default flow selected in settings.";
      setRequestError(message);
      options.onError?.(message);
      return;
    }
    const carrier = getCarrierFromPhone(phoneRef.current);
    if (!carrier) {
      const message = "Phone number must start with +2519/09 or +2517/07.";
      setRequestError(message);
      options.onError?.(message);
      return;
    }
    const shortcode =
      carrier === "safari"
        ? defaultFlowShortcodes.safari
        : defaultFlowShortcodes.tele;
    if (!shortcode) {
      const message =
        carrier === "safari"
          ? "Default flow is missing Safaricom shortcode."
          : "Default flow is missing EthioTelecom shortcode.";
      setRequestError(message);
      options.onError?.(message);
      return;
    }
    setMessageInput(shortcode);
    if (dialPreviewDelayMs > 0) {
      await wait(dialPreviewDelayMs);
    }
    await sendInput(shortcode, { recordTrail: true });
  };

  const startReplay = async () => {
    if (isLoading || replayState.status === "running") return;
    const steps = [...replayTrailRef.current];
    if (steps.length === 0) {
      const message = "No saved replay steps yet. Run one session first.";
      setRequestError(message);
      options.onError?.(message);
      return;
    }

    stopReplayRef.current = false;
    pauseReplayRef.current = false;
    setRequestError(null);
    setMessages([]);
    messageRef.current = [];
    setSequenceNumber(null);
    sequenceRef.current = null;
    setMessageInput("");

    setReplayState({
      status: "running",
      currentStep: 0,
      totalSteps: steps.length,
      error: null,
    });

    for (let index = 0; index < steps.length; index += 1) {
      if (stopReplayRef.current) {
        setReplayState((prev) => ({
          ...prev,
          status: "stopped",
          error: null,
        }));
        return;
      }

      await waitWhilePaused();
      if (stopReplayRef.current) {
        setReplayState((prev) => ({
          ...prev,
          status: "stopped",
          error: null,
        }));
        return;
      }

      setReplayState((prev) => ({
        ...prev,
        status: pauseReplayRef.current ? "paused" : "running",
        currentStep: index + 1,
      }));

      const step = steps[index];
      setMessageInput(step.input);
      if (replayPreviewDelayMs > 0) {
        await wait(replayPreviewDelayMs);
      }
      const sendResult = await sendInput(step.input, { recordTrail: false });
      if (!sendResult.ok || !sendResult.systemMessage) {
        setReplayState((prev) => ({
          ...prev,
          status: "error",
          error: sendResult.ok ? "Replay failed." : sendResult.error,
        }));
        return;
      }

      if (!isResponseMatch(step.expectedResponse, sendResult.systemMessage.content)) {
        const mismatchMessage = `Replay stopped at step ${index + 1}: response changed from last session.`;
        setRequestError(mismatchMessage);
        options.onError?.(mismatchMessage);
        setReplayState((prev) => ({
          ...prev,
          status: "paused",
          error: mismatchMessage,
        }));
        pauseReplayRef.current = true;
        return;
      }

      if (index < steps.length - 1) {
        await wait(replayDelayMs);
      }
    }

    setReplayState((prev) => ({
      ...prev,
      status: "completed",
      currentStep: prev.totalSteps,
      error: null,
    }));
  };

  const pauseReplay = () => {
    if (replayState.status !== "running") return;
    pauseReplayRef.current = true;
    setReplayState((prev) => ({ ...prev, status: "paused" }));
  };

  const resumeReplay = () => {
    if (replayState.status !== "paused") return;
    pauseReplayRef.current = false;
    setReplayState((prev) => ({ ...prev, status: "running", error: null }));
  };

  const stopReplay = () => {
    stopReplayRef.current = true;
    pauseReplayRef.current = false;
    setReplayState((prev) => ({ ...prev, status: "stopped", error: null }));
  };

  const clearReplayTrail = () => {
    setReplayTrail([]);
    replayTrailRef.current = [];
    if (messageRef.current.length === 0) {
      clearSavedSession();
      return;
    }
    persistSnapshot(messageRef.current, [], sequenceRef.current, shortCodeRef.current);
  };

  const resetSession = () => {
    stopReplay();
    setMessages([]);
    messageRef.current = [];
    setSequenceNumber(null);
    sequenceRef.current = null;
    setMessageInput("");
    setRequestError(null);
    setReplayState({
      status: "idle",
      currentStep: 0,
      totalSteps: replayTrailRef.current.length,
      error: null,
    });
    clearSavedSession();
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
    replayTrailCount: replayTrail.length,
    hasReplayData: replayTrail.length > 0,
    replayState,
    hasDefaultDial: Boolean(
      defaultFlowName && (defaultFlowShortcodes.tele || defaultFlowShortcodes.safari)
    ),
    handleSend,
    resetSession,
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,
    clearReplayTrail,
    dialDefaultFlow,
  };
}
