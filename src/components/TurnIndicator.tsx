import React from 'react';
import { Player } from '../types/game';

interface TurnIndicatorProps {
  players: Player[];
  currentTurnIndex: number;
  isRolling: boolean;
  diceValue: number | null;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  players,
  currentTurnIndex,
  isRolling,
  diceValue,
}) => {
  const activePlayer = players[currentTurnIndex];

  return (
    <div className="w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-xl">
      {/* Current Turn Header Banner */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md border-2 border-white ring-2 ring-offset-2 ring-offset-slate-900 transition-transform animate-bounce"
              style={{
                backgroundColor: activePlayer?.color || '#3b82f6',
              }}
            >
              <span>{activePlayer?.avatar || '🦁'}</span>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border border-white" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                ถึงตาของ:
              </span>
              {activePlayer?.isBot ? (
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold">
                  บอท AI 🤖
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  ผู้เล่น 👤
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-xl font-black text-white flex items-center gap-1.5 leading-tight">
              <span style={{ color: activePlayer?.color }}>{activePlayer?.name}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {activePlayer?.isBot
                ? '🤖 บอทกำลังทอยลูกเต๋า...'
                : '🎲 แตะปุ่มทอยลูกเต๋าเพื่อเดิน!'}
            </p>
          </div>
        </div>

        {/* Current position */}
        <div className="text-right">
          <div className="text-[11px] text-slate-400 font-medium">ช่องปัจจุบัน</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 leading-tight">
            {activePlayer?.position || 1}
            <span className="text-xs font-normal text-slate-500"> /100</span>
          </div>
        </div>
      </div>

      {/* Players List in Current Match */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {players.map((p, idx) => {
          const isActive = idx === currentTurnIndex;

          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-slate-700/90 ring-2 ring-amber-400 shadow-md scale-[1.02]'
                  : 'bg-slate-900/50 hover:bg-slate-700/40 opacity-85'
              }`}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base shadow shrink-0 border border-white/40"
                style={{ backgroundColor: p.color }}
              >
                {p.avatar}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center justify-between">
                  <span className="truncate">{p.name}</span>
                  {p.isBot && <span className="text-[10px] text-sky-400">🤖</span>}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>ช่อง {p.position}</span>
                  {p.position === 100 && (
                    <span className="text-amber-400 font-extrabold text-[10px]">ชนะ! 🏆</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
