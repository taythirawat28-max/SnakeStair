import React, { useState } from 'react';
import {
  PLAYER_COLORS,
  PLAYER_AVATARS,
} from '../types/game';

interface CustomPlayerConfig {
  name: string;
  avatar: string;
  color: string;
  isBot: boolean;
}

interface LobbyProps {
  onStartGameWithRoom: (params: {
    roomCode: string;
    players: CustomPlayerConfig[];
  }) => void;
  defaultRoomCode?: string;
}

function generateRandomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartGameWithRoom,
  defaultRoomCode,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [createdRoomCode, setCreatedRoomCode] = useState(() => defaultRoomCode || generateRandomCode());
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [playerCount, setPlayerCount] = useState<number>(2);

  // Default player configurations
  const [playersConfig, setPlayersConfig] = useState<CustomPlayerConfig[]>([
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
      name: 'บอท AI 1',
      avatar: PLAYER_AVATARS[2],
      color: PLAYER_COLORS[2].hex,
      isBot: true,
    },
    {
      name: 'บอท AI 2',
      avatar: PLAYER_AVATARS[3],
      color: PLAYER_COLORS[3].hex,
      isBot: true,
    },
  ]);

  const [activePlayerEditIndex, setActivePlayerEditIndex] = useState(0);

  const updatePlayer = (index: number, updates: Partial<CustomPlayerConfig>) => {
    setPlayersConfig((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const handleStart = (codeToUse: string) => {
    const trimmed = codeToUse.trim().toUpperCase() || generateRandomCode();
    const activePlayers = playersConfig.slice(0, playerCount);
    onStartGameWithRoom({
      roomCode: trimmed,
      players: activePlayers,
    });
  };

  return (
    <div className="w-full max-w-lg bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-2xl">
      {/* Title */}
      <div className="text-center mb-6">
        <span className="text-4xl animate-bounce inline-block">🎲 🐍 🪜</span>
        <h2 className="text-2xl font-black text-white mt-1">เกมบันไดงู (Snakes & Ladders)</h2>
        <p className="text-xs sm:text-sm text-slate-300">
          เล่นด้วยกันโดยใช้เลขห้อง สนุกได้ทันทีไม่ต้องเชื่อมต่อเซิร์ฟเวอร์
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-900/90 rounded-2xl mb-6 text-sm font-bold border border-slate-700/60">
        <button
          type="button"
          onClick={() => setTab('create')}
          className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'create'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>✨</span>
          <span>สร้างห้อง (สุ่มเลข)</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('join')}
          className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'join'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🔢</span>
          <span>จอยเลขห้อง</span>
        </button>
      </div>

      {/* Tab 1: Create Room */}
      {tab === 'create' ? (
        <div className="space-y-5">
          {/* Room Code Showcase */}
          <div className="p-4 bg-slate-900/80 rounded-2xl border border-amber-500/40 text-center relative overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
              เลขห้องของคุณ (Room Code)
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl sm:text-5xl font-black tracking-widest text-white font-mono">
                {createdRoomCode}
              </span>
              <button
                type="button"
                onClick={() => setCreatedRoomCode(generateRandomCode())}
                title="สุ่มเลขห้องใหม่"
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-lg text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
              >
                🔄
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              💡 เพื่อนสามารถเลือกแท็บ &quot;จอยเลขห้อง&quot; แล้วกรอกเลข <strong>{createdRoomCode}</strong> เพื่อใช้กระดานเดียวกันได้!
            </p>
          </div>
        </div>
      ) : (
        /* Tab 2: Join by Room Code */
        <div className="space-y-5">
          <div className="p-4 bg-slate-900/80 rounded-2xl border border-sky-500/40 text-center">
            <label htmlFor="join-room-code-input" className="block text-xs text-sky-400 font-bold uppercase tracking-wider mb-2">
              กรอกเลขห้องที่ต้องการเข้าร่วม
            </label>
            <div className="flex justify-center">
              <input
                id="join-room-code-input"
                type="text"
                maxLength={6}
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                placeholder="เช่น 4829"
                className="w-48 py-2.5 text-center text-3xl font-mono font-black rounded-xl bg-slate-950 border border-sky-500/60 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400 tracking-widest"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              กระดาน บันได และงูจะถูกสร้างให้เหมือนกับห้องนี้ 100%
            </p>
          </div>
        </div>
      )}

      {/* Common Setup: Number of Players */}
      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            จำนวนผู้เล่นในห้อง (2 - 4 คน)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPlayerCount(num)}
                className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  playerCount === num
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg scale-102'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span>👥</span>
                <span>{num} ผู้เล่น</span>
              </button>
            ))}
          </div>
        </div>

        {/* Players List Config */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            รายชื่อผู้เล่น &amp; สัญลักษณ์ตัวเดิน
          </label>
          <div className="space-y-2">
            {playersConfig.slice(0, playerCount).map((p, idx) => {
              const isSelected = activePlayerEditIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActivePlayerEditIndex(idx)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-700/80 border-amber-400/80 shadow-md ring-1 ring-amber-400/40'
                      : 'bg-slate-900/50 border-slate-700/60 hover:bg-slate-700/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Avatar preview */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/20 shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.isBot && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            บอท AI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        แตะเพื่อแก้ไขชื่อ / ไอคอน
                      </div>
                    </div>
                  </div>

                  {/* Toggle Human / Bot */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updatePlayer(idx, {
                        isBot: !p.isBot,
                        name: !p.isBot
                          ? `บอท AI ${idx + 1}`
                          : `ผู้เล่น ${idx + 1}`,
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      p.isBot
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                  >
                    {p.isBot ? '🤖 บอท' : '👤 คนเล่น'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Player Customizer Modal/Panel */}
        {activePlayerEditIndex < playerCount && (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>แก้ไข: {playersConfig[activePlayerEditIndex].name}</span>
              <span className="text-[10px] text-amber-400">ผู้เล่นที่ {activePlayerEditIndex + 1}</span>
            </div>

            {/* Name Input */}
            <input
              type="text"
              value={playersConfig[activePlayerEditIndex].name}
              maxLength={15}
              onChange={(e) =>
                updatePlayer(activePlayerEditIndex, { name: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="ตั้งชื่อผู้เล่น..."
            />

            {/* Avatar Selection */}
            <div>
              <div className="text-[10px] text-slate-400 mb-1">เลือกตัวละคร</div>
              <div className="grid grid-cols-8 gap-1.5">
                {PLAYER_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => updatePlayer(activePlayerEditIndex, { avatar: av })}
                    className={`h-8 rounded-lg text-base flex items-center justify-center transition-all cursor-pointer ${
                      playersConfig[activePlayerEditIndex].avatar === av
                        ? 'bg-amber-400 text-slate-950 scale-110 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <div className="text-[10px] text-slate-400 mb-1">เลือกสีประจำตัว</div>
              <div className="flex items-center gap-2">
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => updatePlayer(activePlayerEditIndex, { color: c.hex })}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                      playersConfig[activePlayerEditIndex].color === c.hex
                        ? 'ring-2 ring-white scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Start Game Action Button */}
        <button
          type="button"
          onClick={() => handleStart(tab === 'create' ? createdRoomCode : joinRoomCode)}
          disabled={tab === 'join' && !joinRoomCode.trim()}
          className={`w-full py-3.5 rounded-2xl font-black text-base sm:text-lg transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
            tab === 'join' && !joinRoomCode.trim()
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-105 text-slate-950 shadow-amber-500/25'
          }`}
        >
          <span>🎲</span>
          <span>
            {tab === 'create'
              ? `เริ่มเล่นเกม (ห้อง #${createdRoomCode})`
              : `เข้าเล่นเกมตามเลขห้อง (#${joinRoomCode || '----'})`}
          </span>
          <span>🚀</span>
        </button>
      </div>
    </div>
  );
};
