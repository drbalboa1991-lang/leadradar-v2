'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'What does my grade mean?',
  'How do I add business hours?',
  'What is structured data?',
  'Is the pro report worth it?',
];

export default function AiChat() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [unread,   setUnread]   = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = data.ok ? data.message : "Sorry, I couldn't connect right now. Try again in a moment.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (!open) setUnread(true);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  const isEmpty = messages.length === 0;

  return (
    // data-leadradar-chat attribute lets the scanner detect this as a live chat widget
    <div data-leadradar-chat="true" className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* Chat panel */}
      {open && (
        <div
          className="flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 'min(380px, calc(100vw - 24px))',
            height: 'min(520px, calc(100vh - 100px))',
            background: 'var(--bg, #fff)',
            border: '1px solid var(--line, #e5e7eb)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: 'var(--brand, #16a34a)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              ✦
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white leading-tight">LeadRadar AI</p>
              <p className="text-xs text-white opacity-75">Ask me anything about your score</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="text-white opacity-70 hover:opacity-100 transition-opacity text-lg leading-none">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Welcome */}
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--brand, #16a34a)', color: '#fff' }}>✦</div>
              <div className="rounded-2xl rounded-tl-none px-3 py-2 text-sm max-w-[85%]"
                style={{ background: 'color-mix(in srgb,var(--brand,#16a34a) 10%,transparent)', color: 'var(--ink, #111)' }}>
                Hi! I can help you understand your LeadRadar score and what to fix. What would you like to know?
              </div>
            </div>

            {/* Starter questions */}
            {isEmpty && (
              <div className="flex flex-wrap gap-2 pl-9">
                {STARTERS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:opacity-80"
                    style={{ borderColor: 'var(--brand,#16a34a)', color: 'var(--brand,#16a34a)', background: 'transparent' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation */}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--brand, #16a34a)', color: '#fff' }}>✦</div>
                )}
                <div
                  className="rounded-2xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap"
                  style={m.role === 'user'
                    ? { background: 'var(--brand,#16a34a)', color: '#fff', borderRadius: '16px 16px 4px 16px' }
                    : { background: 'color-mix(in srgb,var(--brand,#16a34a) 10%,transparent)', color: 'var(--ink,#111)', borderRadius: '4px 16px 16px 16px' }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--brand,#16a34a)', color: '#fff' }}>✦</div>
                <div className="rounded-2xl rounded-tl-none px-4 py-3"
                  style={{ background: 'color-mix(in srgb,var(--brand,#16a34a) 10%,transparent)' }}>
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: 'var(--brand,#16a34a)', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 shrink-0 border-t" style={{ borderColor: 'var(--line,#e5e7eb)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a question…"
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl border text-sm disabled:opacity-50 outline-none"
                style={{
                  borderColor: 'var(--line,#e5e7eb)',
                  background: 'color-mix(in srgb,var(--bg,#fff) 80%,transparent)',
                  color: 'var(--ink,#111)',
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                style={{ background: 'var(--brand,#16a34a)', color: '#fff' }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-2xl transition-transform hover:scale-105 active:scale-95 relative"
        style={{ background: 'var(--brand,#16a34a)', color: '#fff' }}
        aria-label="Open AI chat"
      >
        {open ? '✕' : '✦'}
        {unread && !open && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
            style={{ background: '#ef4444' }} />
        )}
      </button>
    </div>
  );
}
