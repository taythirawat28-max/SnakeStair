import React from 'react';
import { LogItem, FloatingReaction } from '../types/game';

interface GameLogProps {
  logs: LogItem[];
  reactions: FloatingReaction[];
  onSendReaction: (emoji: string) => void;
}

const EMOJI_LIST = ['🎉', '😂', '😭', '🐍', '🪜', '🎲', '🔥', '😱'];

export const GameLog: React.FC<GameLogProps> = ({
  logs,
  reactions,
  onSendReaction,
}) => {
  return (
    <>
      {/* Floating Reactions Overlay */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-10 flex flex-col items-center animate-float-up pointer-events-none"
            style={{ left: `${r.x}%` }}
          >
            <div className="text-3xl sm:text-4xl drop-shadow-lg">{r.emoji}</div>
            <div
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-sm mt-1 whitespace-nowrap"
              style={{ backgroundColor: r.senderColor }}
            >
              {r.senderName}
            </div>
          </div>
        ))}
      </div>

      {/* Game Logs & Reactions Card */}
      <div className="w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-xl flex flex-col h-full max-h-[300px]">
        {/* Quick Reaction Bar */}
        <div className="mb-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>ส่งรีแอ็กชันด่วน</span>
            <span className="text-[10px] text-amber-400">กดส่งให้เพื่อนเห็นทันที</span>
          </div>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendReaction(emoji)}
                className="w-8 h-8 rounded-xl bg-slate-700/70 hover:bg-slate-600 text-lg flex items-center justify-center transition-transform hover:scale-125 active:scale-95 cursor-pointer shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            บันทึกการเล่นล่าสุด
          </div>
          {logs.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 text-center">ยังไม่มีประวัติการเดิน</div>
          ) : (
            logs.map((log) => {
              return (
                <div
                  key={log.id}
                  className={`text-xs p-1.5 rounded-lg flex items-center gap-1.5 ${
                    log.type === 'win'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40'
                      : log.type === 'ladder'
                      ? 'bg-sky-500/10 text-sky-300 font-medium'
                      : log.type === 'snake'
                      ? 'bg-rose-500/10 text-rose-300 font-medium'
                      : 'bg-slate-900/50 text-slate-300'
                  }`}
                >
                  <span className="shrink-0">
                    {log.type === 'win'
                      ? '🏆'
                      : log.type === 'ladder'
                      ? '🪜'
                      : log.type === 'snake'
                      ? '🐍'
                      : log.type === 'dice'
                      ? '🎲'
                      : '📢'}
                  </span>
                  <span className="leading-tight">{log.text}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
