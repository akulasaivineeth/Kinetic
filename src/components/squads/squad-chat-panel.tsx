'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { KCard, KAvatar } from '@/components/ui/k-primitives';
import { K } from '@/lib/design-tokens';
import { useSquadChatRealtime } from '@/hooks/use-squad-chat-realtime';
import { useSendTeamMessage } from '@/hooks/use-teams';
import type { TeamMessage } from '@/types/database';

interface SquadChatPanelProps {
  teamId: string;
  userId: string | undefined;
  messages: TeamMessage[];
  loadChat: boolean;
  /** When false, skips realtime channel (e.g. off Chat tab). */
  realtimeActive?: boolean;
}

export function SquadChatPanel({ teamId, userId, messages, loadChat, realtimeActive = true }: SquadChatPanelProps) {
  const sendMessage = useSendTeamMessage();
  const [chatInput, setChatInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { typingLabel, broadcastTyping } = useSquadChatRealtime(teamId, realtimeActive);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const grouped = useMemo(() => {
    const out: { key: string; dayLabel: string; items: TeamMessage[] }[] = [];
    for (const m of messages) {
      const d = new Date(m.created_at);
      const dayKey = format(d, 'yyyy-MM-dd');
      const dayLabel = isSameDay(d, new Date()) ? 'Today' : format(d, 'EEEE, MMM d');
      const last = out[out.length - 1];
      if (last && last.key === dayKey) last.items.push(m);
      else out.push({ key: dayKey, dayLabel, items: [m] });
    }
    return out;
  }, [messages]);

  const handleSend = async () => {
    if (!chatInput.trim() || sendMessage.isPending) return;
    try {
      await sendMessage.mutateAsync({ teamId, content: chatInput.trim() });
      setChatInput('');
    } catch {
      /* noop */
    }
  };

  return (
    <div className="flex flex-col min-h-[52vh]">
      <div className="flex-1 space-y-4 mb-3 overflow-y-auto max-h-[min(56vh,520px)] pr-0.5">
        {loadChat ? (
          <div className="h-24 rounded-k-lg bg-k-card animate-pulse" />
        ) : messages.length === 0 ? (
          <KCard className="text-center py-12 px-4">
            <p className="text-sm font-semibold text-k-ink">Start the thread</p>
            <p className="text-[12px] text-k-muted-soft mt-2 leading-relaxed">
              Quick updates, trash talk, or rest-day check-ins — your squad sees it here.
            </p>
          </KCard>
        ) : (
          grouped.map((group) => (
            <div key={group.key}>
              <div className="flex justify-center mb-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-k-pill"
                  style={{ background: K.mintSoft, color: K.muted }}
                >
                  {group.dayLabel}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((m) => {
                  const mine = !!userId && m.user_id === userId;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${mine ? 'justify-end flex-row-reverse' : 'justify-start'}`}
                    >
                      {!mine && (
                        <KAvatar name={m.full_name} src={m.avatar_url || null} size={34} className="mt-0.5 shrink-0" />
                      )}
                      <div className={`max-w-[min(88%,320px)] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        {!mine && (
                          <span className="text-[11px] font-bold text-k-ink truncate px-1">{m.full_name}</span>
                        )}
                        <div
                          className="rounded-2xl px-3.5 py-2.5 shadow-k-card"
                          style={{
                            background: mine ? K.green : K.card,
                            color: mine ? '#fff' : K.ink,
                            border: mine ? 'none' : `1px solid ${K.lineStrong}`,
                            borderBottomRightRadius: mine ? 6 : undefined,
                            borderBottomLeftRadius: mine ? undefined : 6,
                          }}
                        >
                          <p
                            className="text-[14px] leading-snug whitespace-pre-wrap break-words"
                            style={{ color: mine ? '#fff' : K.ink }}
                          >
                            {m.content}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-1 ${mine ? 'text-k-muted-soft text-right' : 'text-k-muted-soft'}`}
                        >
                          {format(new Date(m.created_at), 'h:mm a')}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <AnimatePresence mode="wait">
        {typingLabel ? (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-[11px] text-k-muted-soft italic px-1 mb-2"
          >
            {typingLabel}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="sticky bottom-0 pt-2 mt-auto border-t border-k-line bg-k-bg pb-[max(8px,env(safe-area-inset-bottom))]">
        <div className="flex gap-2 items-end">
          <textarea
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              if (e.target.value.trim()) broadcastTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            placeholder="Message squad…"
            className="flex-1 resize-none px-3 py-2.5 rounded-k-lg border border-k-line-strong bg-k-card text-[13px] text-k-ink placeholder:text-k-muted-soft focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!chatInput.trim() || sendMessage.isPending}
            className="shrink-0 w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center disabled:opacity-40 shadow-k-fab"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
