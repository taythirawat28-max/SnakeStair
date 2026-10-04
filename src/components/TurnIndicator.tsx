import React from 'react';
import { Player } from '../types/game';

interface TurnIndicatorProps {
  players: Player[];
  currentTurnIndex: number;
  myPlayerId: string;
  isRolling: boolean;
  diceValue: number | null;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  players,
  currentTurnIndex,
  myPlayerId,
  isRolling,
  diceValue,
}) => {
  const activePlayer = players[currentTurnIndex];
  const isMyTurn = activePlayer?.id === myPlayerId;

  return (
    <div className="w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-xl">
      {/* Current Turn Header Banner */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-md border-2 border-white ring-2 ring-offset-1 ring-offset-slate-900 transition-transform animate-pulse"
              style={{
                backgroundColor: activePlayer?.color || '#3b82f6',
              }}
            >
              <span>{activePlayer?.avatar || '🦁'}</span>
            </div>
            {isMyTurn && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-white" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                ตาของผู้เล่น:
              </span>
              {isMyTurn && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-full font-bold">
                  ตาของคุณ!
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 leading-tight">
              <span style={{ color: activePlayer?.color }}>{activePlayer?.name}</span>
              {activePlayer?.isBot && <span className="text-xs text-slate-400">🤖 บอท</span>}
            </h3>
          </div>
        </div>

        {/* Dice status preview */}
        <div className="text-right">
          <div className="text-[11px] text-slate-400">ช่องปัจจุบัน</div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {activePlayer?.position || 1}
            <span className="text-xs font-normal text-slate-400"> /100</span>
          </div>
        </div>
      </div>

      {/* Players List in Current Match */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {players.map((p, idx) => {
          const isActive = idx === currentTurnIndex;
          const isMe = p.id === myPlayerId;

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
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow shrink-0 border border-white/60"
                style={{ backgroundColor: p.color }}
              >
                {p.avatar}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <span className="truncate">{p.name}</span>
                  {isMe && <span className="text-[9px] text-amber-300 shrink-0">(คุณ)</span>}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>ช่อง {p.position}</span>
                  {p.rank ? (
                    <span className="text-amber-400 font-extrabold text-[10px]">อันดับ {p.rank} 🏆</span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
