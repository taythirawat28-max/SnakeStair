import React, { useState } from 'react';
import {
  Player,
  PLAYER_COLORS,
  PLAYER_AVATARS,
  Snake,
  Ladder,
} from '../types/game';

interface LobbyProps {
  roomCode?: string;
  isHost?: boolean;
  players?: Player[];
  onStartGame?: () => void;
  onAddBot?: () => void;
  onRerollBoard?: () => void;
  onLeaveRoom?: () => void;
  onCreateRoom: (data: { playerName: string; avatar: string; color: string }) => void;
  onJoinRoom: (data: { roomCode: string; playerName: string; avatar: string; color: string }) => void;
  onStartLocalGame: (playersCount: number, botCount: number) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  snakesCount?: number;
  laddersCount?: number;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomCode,
  isHost = false,
  players = [],
  onStartGame,
  onAddBot,
  onRerollBoard,
  onLeaveRoom,
  onCreateRoom,
  onJoinRoom,
  onStartLocalGame,
  isLoading,
  errorMessage,
  snakesCount = 7,
  laddersCount = 8,
}) => {
  const [tab, setTab] = useState<'create' | 'join' | 'local'>('create');
  const [playerName, setPlayerName] = useState('ผู้เล่น 1');
  const [inputCode, setInputCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PLAYER_AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0].hex);
  const [copiedText, setCopiedText] = useState(false);

  // Local game settings
  const [localPlayersCount, setLocalPlayersCount] = useState(2);
  const [localBotCount, setLocalBotCount] = useState(1);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyShareLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // If already inside a room, show Room Lobby view
  if (roomCode) {
    return (
      <div className="w-full max-w-lg bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-3xl sm:text-4xl">🎲 🐍 🪜</span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">ห้องเตรียมพร้อมเล่นเกม</h2>
          <p className="text-xs sm:text-sm text-slate-400">ส่งรหัสห้องให้เพื่อนเพื่อเข้ามาร่วมเล่นด้วยกัน!</p>
        </div>

        {/* Room Code Showcase */}
        <div className="bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-amber-500/40 text-center mb-6 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
          <div className="text-xs text-amber-400 uppercase tracking-widest font-bold mb-1">
            รหัสห้อง (Room Code)
          </div>
          <div className="text-4xl sm:text-5xl font-black tracking-widest text-white font-mono my-1 select-all">
            {roomCode}
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => handleCopyCode(roomCode)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>{copiedText ? '✓ คัดลอกแล้ว!' : '📋 คัดลอกรหัส'}</span>
            </button>
            <button
              onClick={() => handleCopyShareLink(roomCode)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <span>🔗 แชร์ลิงก์ห้อง</span>
            </button>
          </div>
        </div>

        {/* Players List (2-4 Players) */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300 font-bold mb-2.5">
            <span>ผู้เล่นในห้อง ({players.length}/4 คน)</span>
            <span className="text-[11px] text-slate-400">ต้องการอย่างน้อย 1-4 คน</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-700/60 border border-slate-600/60 shadow-sm"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow border-2 border-white shrink-0"
                  style={{ backgroundColor: p.color }}
                >
                  {p.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-sm sm:text-base truncate flex items-center gap-1.5">
                    <span className="truncate">{p.name}</span>
                    {p.isHost && (
                      <span className="text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded font-black shrink-0">
                        👑 หัวหน้า
                      </span>
                    )}
                    {p.isBot && (
                      <span className="text-[10px] bg-sky-400 text-slate-900 px-1.5 py-0.5 rounded font-bold shrink-0">
                        🤖 บอท
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>พร้อมเล่น</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty player slots */}
            {Array.from({ length: 4 - players.length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-slate-700/80 text-slate-500 text-xs sm:text-sm"
              >
                <span>👤</span>
                <span>รอผู้เล่นเข้าร่วม...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Board details & reroll */}
        <div className="bg-slate-900/50 rounded-xl p-3 mb-5 border border-slate-700/60 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-3 text-slate-300">
            <span>บันได: <strong className="text-amber-400">{laddersCount} จุด 🪜</strong></span>
            <span>งู: <strong className="text-rose-400">{snakesCount} ตัว 🐍</strong></span>
          </div>
          {isHost && onRerollBoard && (
            <button
              onClick={onRerollBoard}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold underline flex items-center gap-1 cursor-pointer"
            >
              <span>สุ่มแผนที่ใหม่</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {isHost ? (
            <div className="flex flex-col sm:flex-row gap-2">
              {players.length < 4 && onAddBot && (
                <button
                  onClick={onAddBot}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🤖</span>
                  <span>เพิ่มผู้เล่นบอท</span>
                </button>
              )}
              <button
                onClick={onStartGame}
                disabled={players.length < 1}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <span>🚀</span>
                <span>เริ่มเกมเลย!</span>
              </button>
            </div>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-xl bg-slate-900/80 border border-slate-700 text-center text-slate-300 font-medium text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>รอหัวหน้าห้อง ({players.find((p) => p.isHost)?.name || 'Host'}) กดเริ่มเกม...</span>
            </div>
          )}

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              ออกจากห้อง
            </button>
          )}
        </div>
      </div>
    );
  }

  // Not in a room: Show Initial Menu (Create / Join / Local)
  return (
    <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-2xl">
      {/* Title & Branding */}
      <div className="text-center mb-6">
        <div className="inline-block p-2 bg-amber-500/20 rounded-2xl border border-amber-400/40 mb-2">
          <span className="text-3xl sm:text-4xl">🪜 🐍 🎲</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
          เกมบันไดงู มัลติเพลเยอร์
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Snakes and Ladders Online • เล่นออนไลน์แบบเรียลไทม์
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-2xl mb-5 border border-slate-700/80 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setTab('create')}
          className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
            tab === 'create'
              ? 'bg-amber-500 text-slate-900 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          สร้างห้องใหม่
        </button>
        <button
          onClick={() => setTab('join')}
          className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
            tab === 'join'
              ? 'bg-amber-500 text-slate-900 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          กรอกเลขห้อง
        </button>
        <button
          onClick={() => setTab('local')}
          className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
            tab === 'local'
              ? 'bg-amber-500 text-slate-900 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          เล่นในเครื่อง
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* User Customization (Name, Avatar, Color) */}
      <div className="space-y-4 mb-6">
        {/* Name input */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">ชื่อผู้เล่นของคุณ</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={15}
            placeholder="ใส่ชื่อของคุณ"
            className="w-full bg-slate-900/80 border border-slate-600 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Avatar Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">เลือกไอคอนตัวละคร</label>
          <div className="flex flex-wrap gap-2">
            {PLAYER_AVATARS.slice(0, 8).map((avatar) => (
              <button
                key={avatar}
                type="button"
                onClick={() => setSelectedAvatar(avatar)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                  selectedAvatar === avatar
                    ? 'bg-amber-500 scale-110 shadow-lg ring-2 ring-white'
                    : 'bg-slate-700/60 hover:bg-slate-700 text-white'
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">เลือกสีตัวเดิน</label>
          <div className="grid grid-cols-4 gap-2">
            {PLAYER_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => setSelectedColor(color.hex)}
                className={`h-9 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer ${
                  selectedColor === color.hex
                    ? 'border-white scale-105 shadow-md ring-2 ring-amber-400'
                    : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {selectedColor === color.hex && <span className="text-white text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Specific Content */}
      {tab === 'create' && (
        <button
          onClick={() =>
            onCreateRoom({
              playerName: playerName.trim() || 'ผู้เล่น 1',
              avatar: selectedAvatar,
              color: selectedColor,
            })
          }
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900 font-black text-base shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <span>✨</span>
          <span>{isLoading ? 'กำลังสร้างห้อง...' : 'สร้างห้องใหม่ (รับรหัสห้อง)'}</span>
        </button>
      )}

      {tab === 'join' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              กรอกเลขห้อง (4 ตัวอักษร)
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="เช่น 7492 หรือ A8B3"
              className="w-full bg-slate-900/80 border border-slate-600 rounded-xl px-3.5 py-3 text-center text-white font-mono font-black text-xl tracking-widest focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <button
            onClick={() =>
              onJoinRoom({
                roomCode: inputCode.trim(),
                playerName: playerName.trim() || 'ผู้เล่น 2',
                avatar: selectedAvatar,
                color: selectedColor,
              })
            }
            disabled={isLoading || !inputCode.trim()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-base shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <span>🚪</span>
            <span>{isLoading ? 'กำลังเข้าห้อง...' : 'เข้าร่วมห้องนี้'}</span>
          </button>
        </div>
      )}

      {tab === 'local' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 text-xs sm:text-sm text-slate-300">
            โหมดนี้สามารถเล่นสลับกันในเครื่องเดียวกัน (Pass & Play) หรือจะเพิ่มบอท AI มาเล่นด้วยก็ได้!
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">จำนวนผู้เล่นคน</label>
              <select
                value={localPlayersCount}
                onChange={(e) => setLocalPlayersCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-white text-sm"
              >
                <option value={1}>1 คน (เล่นกับบอท)</option>
                <option value={2}>2 คน (สลับกันเล่น)</option>
                <option value={3}>3 คน</option>
                <option value={4}>4 คน</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">จำนวนบอท AI</label>
              <select
                value={localBotCount}
                onChange={(e) => setLocalBotCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-white text-sm"
              >
                <option value={0}>ไม่มีบอท</option>
                <option value={1}>1 บอท</option>
                <option value={2}>2 บอท</option>
                <option value={3}>3 บอท</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => onStartLocalGame(localPlayersCount, localBotCount)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <span>🎮</span>
            <span>เริ่มเล่นแบบออฟไลน์เลย</span>
          </button>
        </div>
      )}
    </div>
  );
};
