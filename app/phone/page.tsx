"use client";

import { useUssdSimulator } from "@/hooks/useUssdSimulator";

export default function PhoneSessionPage() {
  const {
    phoneNumber,
    setPhoneNumber,
    messageInput,
    setMessageInput,
    messages,
    sequenceNumber,
    isLoading,
    requestError,
    hasReplayData,
    replayTrailCount,
    replayState,
    handleSend,
    resetSession,
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,
    clearReplayTrail,
  } = useUssdSimulator({
    initialPhone: "+251979458662",
    initialShortCode: "*675#",
  });
  const isReplayRunning = replayState.status === "running";
  const isReplayPaused = replayState.status === "paused";
  const isReplayActive = isReplayRunning || isReplayPaused;

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isReplayRunning) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-transparent text-white">
      <div
        className="min-h-dvh bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/phone-bg.jpg')" }}
      >
        <div className="min-h-dvh bg-linear-to-br from-white/70 via-sky-100/50 to-blue-100/60 backdrop-blur-[1px]">
        <div className="mx-auto flex min-h-dvh w-full max-w-none flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
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
          <div className="mt-3 rounded-lg bg-white/5 px-2 py-1.5 text-[10px] text-white/80">
            <div className="mb-1 flex items-center justify-between">
              <span>Steps: {replayTrailCount}</span>
              <span className="uppercase">{replayState.status}</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={startReplay}
                disabled={!hasReplayData || isReplayActive || isLoading}
                className="rounded bg-emerald-600 px-2 py-1 text-white whitespace-nowrap disabled:cursor-not-allowed disabled:bg-white/10"
              >
                Auto Replay
              </button>
              <button
                onClick={isReplayPaused ? resumeReplay : pauseReplay}
                disabled={!isReplayActive || isLoading}
                className="rounded bg-amber-500 px-2 py-1 text-white whitespace-nowrap disabled:cursor-not-allowed disabled:bg-white/10"
              >
                {isReplayPaused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={stopReplay}
                disabled={!isReplayActive}
                className="rounded bg-white/10 px-2 py-1 text-white whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stop
              </button>
              <button
                onClick={clearReplayTrail}
                disabled={!hasReplayData || isReplayActive || isLoading}
                className="rounded bg-white/10 px-2 py-1 text-white whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-col rounded-3xl bg-[#1c1c1e] p-4 shadow-2xl">
            {isLoading ? (
              <div className="flex min-h-15 items-center justify-center gap-4 text-center">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/25 border-t-emerald-400" />
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
                <div className="min-h-16 pr-1 text-[14px] leading-5">
                  {messages.length === 0 ? (
                    <div className="text-sm font-semibold">
                      Enter USSD Code to start session (e.g. *123#)
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap min-h-10">
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
                      className="w-full border-b-2 border-emerald-500/80 bg-transparent p-1 text-center text-lg text-white font-bold outline-none placeholder:text-white/60 caret-emerald-500"
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
                        className="py-3 text-sm font-semibold text-emerald-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isLoading || !messageInput.trim() || isReplayActive}
                        className="inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-emerald-400"
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
    </div>
  );
}
