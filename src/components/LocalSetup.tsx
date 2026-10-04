import React, { useState } from 'react';
import {
  Player,
  PLAYER_COLORS,
  PLAYER_AVATARS,
} from '../types/game';

interface LocalSetupProps {
  onStartGame: (players: Player[]) => void;
  onRerollBoard?: () => void;
  laddersCount: number;
  snakesCount: number;
}

export const LocalSetup: React.FC<LocalSetupProps> = ({
  onStartGame,
  onRerollBoard,
  laddersCount,
  snakesCount,
}) => {
  const [playerCount, setPlayerCount] = useState<number>(2);

  const [players, setPlayers] = useState<Array<{
    name: string;
    avatar: string;
    color: string;
    isBot: boolean;
  }>>([
    {
      name: 'ผู้เล่น 1',
      avatar: PLAYER_AVATARS[0],
      color: PLAYER_COLORS[0].hex,
      isBot: false,
    },
    {
      name: 'ผู้เล่น 2',
      avatar: PLAYER_AVATARS[1],
      color: PLAYER_COLORS[1].hex,
      isBot: false,
    },
    {
      name: 'ผู้เล่น 3',
      avatar: PLAYER_AVATARS[2],
      color: PLAYER_COLORS[2].hex,
      isBot: true,
    },
    {
      name: 'ผู้เล่น 4',
      avatar: PLAYER_AVATARS[3],
      color: PLAYER_COLORS[3].hex,
      isBot: true,
    },
  ]);

  const [activeEditIndex, setActiveEditIndex] = useState<number>(0);

  const updatePlayer = (index: number, updates: Partial<(typeof players)[0]>) => {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const handleStart = () => {
    const activePlayers: Player[] = players.slice(0, playerCount).map((p, idx) => ({
      id: `local_p_${idx + 1}`,
      name: (p.name || `ผู้เล่น ${idx + 1}`).trim().slice(0, 15),
      avatar: p.avatar,
      color: p.color,
      position: 1,
      isHost: idx === 0,
      isBot: p.isBot,
      isReady: true,
      connected: true,
    }));

    onStartGame(activePlayers);
  };

  const currentPlayer = players[activeEditIndex];

  return (
    <div className="w-full max-w-xl bg-slate-800/95 backdrop-blur-md rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <div className="text-4xl animate-bounce inline-block">🎲 🐍 🪜</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          เกมบันไดงู (เล่นในเครื่องเดียวกัน)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          ผลัดกันทอยลูกเต๋าในเครื่องเดียว เล่นได้ 2-4 คน (คนเล่นด้วยกันหรือเล่นกับบอท AI)
        </p>
      </div>

      {/* Select Number of Players */}
      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
          เลือกจำนวนผู้เล่น (2 - 4 คน)
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {[2, 3, 4].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => {
                setPlayerCount(count);
                if (activeEditIndex >= count) setActiveEditIndex(count - 1);
              }}
              className={`py-3 rounded-2xl font-black text-base sm:text-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                playerCount === count
                  ? 'bg-amber-500 text-slate-950 scale-102 ring-2 ring-white/50 shadow-amber-500/25'
                  : 'bg-slate-900/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
              }`}
            >
              <span>{count === 2 ? '👥' : count === 3 ? '👨‍👩‍👦' : '👨‍👩‍👧‍👦'}</span>
              <span>{count} คน</span>
            </button>
          ))}
        </div>
      </div>

      {/* Player Tabs */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
          <span>แตะเพื่อปรับแต่งผู้เล่น:</span>
          <span className="text-slate-400">แก้ไขผู้เล่น #{activeEditIndex + 1}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {players.slice(0, playerCount).map((p, idx) => (
            <button
              key={`tab-${idx}`}
              type="button"
              onClick={() => setActiveEditIndex(idx)}
              className={`p-2.5 rounded-2xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                activeEditIndex === idx
                  ? 'bg-slate-700/90 border-amber-400 shadow-md ring-1 ring-amber-400'
                  : 'bg-slate-900/70 hover:bg-slate-800 border-slate-700/80 text-slate-400'
              }`}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-white/20"
                style={{ backgroundColor: p.color }}
              >
                {p.avatar}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">{p.name}</div>
                <div className="text-[10px] text-slate-400">
                  {p.isBot ? 'บอท AI 🤖' : 'คนเล่น 👤'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Player Customizer Card */}
      {currentPlayer && (
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">
              การตั้งค่า: ผู้เล่นคนที่ {activeEditIndex + 1}
            </span>

            {/* Toggle Human / Bot */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => updatePlayer(activeEditIndex, { isBot: false })}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  !currentPlayer.isBot
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👤 คนเล่น
              </button>
              <button
                type="button"
                onClick={() => updatePlayer(activeEditIndex, { isBot: true })}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currentPlayer.isBot
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🤖 บอท AI
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              ชื่อผู้เล่น
            </label>
            <input
              type="text"
              maxLength={15}
              value={currentPlayer.name}
              onChange={(e) => updatePlayer(activeEditIndex, { name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              เลือกตัวละคร
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {PLAYER_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => updatePlayer(activeEditIndex, { avatar: av })}
                  className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                    currentPlayer.avatar === av
                      ? 'bg-amber-500 text-slate-950 scale-105 ring-2 ring-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              เลือกสีประจำตัว
            </label>
            <div className="flex items-center gap-3">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => updatePlayer(activeEditIndex, { color: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  className={`w-8 h-8 rounded-full transition-transform cursor-pointer shadow-md ${
                    currentPlayer.color === c.hex
                      ? 'ring-4 ring-white scale-115'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Board info & Reroll */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span>กระดานสุ่ม:</span>
          <span className="text-amber-400 font-bold">บันได {laddersCount} ตัว 🪜</span>
          <span>•</span>
          <span className="text-rose-400 font-bold">งู {snakesCount} ตัว 🐍</span>
        </div>
        {onRerollBoard && (
          <button
            type="button"
            onClick={onRerollBoard}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>🔄</span>
            <span>สุ่มกระดานใหม่</span>
          </button>
        )}
      </div>

      {/* Start Button */}
      <button
        type="button"
        onClick={handleStart}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-105 active:scale-98 text-slate-950 font-black text-lg sm:text-xl transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
      >
        <span>🎮</span>
        <span>เริ่มเล่นเกมทันที (Start Game)</span>
        <span>🚀</span>
      </button>
    </div>
  );
};
