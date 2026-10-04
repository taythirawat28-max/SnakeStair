import React, { useState } from 'react';
import {
  Player,
  RoomState,
  PLAYER_COLORS,
  PLAYER_AVATARS,
} from '../types/game';

interface LobbyProps {
  room: RoomState | null;
  myPlayerId: string;
  onCreateRoom: (data: { playerName: string; avatar: string; color: string }) => Promise<void>;
  onJoinRoom: (data: { roomCode: string; playerName: string; avatar: string; color: string }) => Promise<void>;
  onStartGame: () => Promise<void>;
  onAddBot: () => Promise<void>;
  onRerollBoard: () => Promise<void>;
  onLeaveRoom: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  myPlayerId,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onAddBot,
  onRerollBoard,
  onLeaveRoom,
  isLoading,
  errorMessage,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') ? 'join' : 'create';
  });
  const [playerName, setPlayerName] = useState('ผู้เล่น 1');
  const [joinCode, setJoinCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || '').trim().toUpperCase();
  });
  const [selectedAvatar, setSelectedAvatar] = useState(PLAYER_AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0].hex);
  const [copiedCodeToast, setCopiedCodeToast] = useState(false);
  const [copiedLinkToast, setCopiedLinkToast] = useState(false);

  const isHost = Boolean(room && (room.hostId === myPlayerId || room.players[0]?.id === myPlayerId));

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeToast(true);
    setTimeout(() => setCopiedCodeToast(false), 2000);
  };

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkToast(true);
    setTimeout(() => setCopiedLinkToast(false), 2000);
  };

  // IF INSIDE WAITING ROOM (status === 'lobby')
  if (room && room.status === 'lobby') {
    const canStart = room.players.length >= 2;

    return (
      <div className="w-full max-w-xl bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-2xl space-y-6">
        {/* Waiting Room Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>ห้องรอผู้เล่น (Waiting Lobby)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            รอเพื่อนจอยเข้าห้อง...
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ส่งรหัสห้องหรือลิงก์ให้เพื่อน เมื่อเพื่อนกดเข้าร่วมจะปรากฏชื่อที่นี่ทันที!
          </p>
        </div>

        {/* Room Code Showcase Box */}
        <div className="p-5 bg-slate-900/90 rounded-2xl border-2 border-amber-500/50 text-center relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />
          <div className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">
            เลขห้องสำหรับชวนเพื่อน (ROOM CODE)
          </div>
          <div className="text-5xl sm:text-6xl font-black font-mono tracking-widest text-white my-1 select-all drop-shadow">
            {room.code}
          </div>

          <div className="flex items-center justify-center gap-2.5 mt-4">
            <button
              type="button"
              onClick={() => handleCopyCode(room.code)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>{copiedCodeToast ? '✓ คัดลอกแล้ว!' : '📋 คัดลอกเลขห้อง'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyLink(room.code)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <span>{copiedLinkToast ? '✓ คัดลอกลิงก์แล้ว!' : '🔗 คัดลอกลิงก์'}</span>
            </button>
          </div>
        </div>

        {/* Connected Players List (4 Slots) */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2.5">
            <span>ผู้เล่นในห้อง ({room.players.length}/4 คน)</span>
            <span className="text-amber-400 font-medium">บันได {room.ladders.length} ตัว • งู {room.snakes.length} ตัว</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((slotIdx) => {
              const player = room.players[slotIdx];
              if (player) {
                const isMe = player.id === myPlayerId;
                return (
                  <div
                    key={player.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-md border border-white/20 shrink-0"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.avatar}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-black text-white flex items-center gap-1.5 truncate">
                          <span className="truncate">{player.name}</span>
                          {player.isHost && (
                            <span title="หัวห้อง" className="text-xs">👑</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          {isMe && <span className="text-amber-300 font-bold">(คุณ)</span>}
                          {player.isBot ? (
                            <span className="text-sky-400">บอท AI 🤖</span>
                          ) : (
                            <span className="text-emerald-400">ออนไลน์ ✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                      #{slotIdx + 1}
                    </span>
                  </div>
                );
              }

              // Empty Slot waiting for players
              return (
                <div
                  key={`empty-${slotIdx}`}
                  className="p-3 rounded-2xl border-2 border-dashed border-slate-700/60 bg-slate-900/30 flex items-center gap-3 text-slate-500"
                >
                  <div className="w-11 h-11 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-xl shrink-0">
                    ⏳
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-400">รอผู้เล่นคนที่ {slotIdx + 1}...</div>
                    <div className="text-[10px] text-slate-500 animate-pulse">กำลังรอคนอื่นจอยเข้ามา</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error message in lobby */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          {isHost ? (
            <>
              {/* Host Quick Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onAddBot}
                  disabled={isLoading || room.players.length >= 4}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-600 text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🤖</span>
                  <span>เพิ่มบอท AI</span>
                </button>

                <button
                  type="button"
                  onClick={onRerollBoard}
                  disabled={isLoading}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-600 text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🔄</span>
                  <span>สุ่มกระดานใหม่</span>
                </button>
              </div>

              {/* Big Start Button */}
              <button
                type="button"
                onClick={onStartGame}
                disabled={isLoading || !canStart}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2 active:scale-98 ${
                  canStart && !isLoading
                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:brightness-105 text-slate-950 shadow-emerald-500/25 cursor-pointer animate-pulse'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>🎮</span>
                <span>{isLoading ? 'กำลังโหลด...' : 'เริ่มเล่นเกมทันที (Start Game)'}</span>
                <span>🚀</span>
              </button>

              {!canStart && (
                <p className="text-center text-xs text-amber-400/90 font-medium">
                  💡 ต้องการผู้เล่นอย่างน้อย 2 คน (รอเพื่อนจอยเข้าห้อง หรือกด &quot;เพิ่มบอท AI&quot;)
                </p>
              )}
            </>
          ) : (
            /* Guest Waiting Banner */
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>กำลังรอหัวห้องกดเริ่มเกม...</span>
              </div>
              <p className="text-xs text-slate-400">
                เมื่อหัวห้องกดเริ่มเกม หน้าจอของคุณจะเข้าสู่กระดานเล่นเกมทันที!
              </p>
            </div>
          )}

          {/* Leave Room Button */}
          <button
            type="button"
            onClick={onLeaveRoom}
            className="w-full py-2.5 rounded-xl bg-slate-900/60 hover:bg-rose-500/20 border border-slate-700/80 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer"
          >
            ออกจากห้อง
          </button>
        </div>
      </div>
    );
  }

  // IF NOT IN ROOM YET (CREATE / JOIN TABS)
  return (
    <div className="w-full max-w-lg bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-2xl">
      {/* Title */}
      <div className="text-center mb-6">
        <span className="text-4xl animate-bounce inline-block">🎲 🐍 🪜</span>
        <h2 className="text-2xl font-black text-white mt-1">เกมบันไดงู มัลติเพลเยอร์</h2>
        <p className="text-xs sm:text-sm text-slate-300">
          สร้างห้องรอเพื่อนจอย หรือกรอกรหัสห้องเพื่อเล่นด้วยกันแบบเรียลไทม์
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
          <span>🚀</span>
          <span>สร้างห้องรอเพื่อน</span>
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

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab: Join Room - Code Input */}
      {tab === 'join' && (
        <div className="mb-5 p-4 rounded-2xl bg-slate-900/90 border border-sky-500/40 text-center">
          <label htmlFor="join-room-code-input" className="block text-xs text-sky-400 font-bold uppercase tracking-wider mb-2">
            กรอกเลขห้องที่ต้องการเข้าร่วม
          </label>
          <div className="flex justify-center">
            <input
              id="join-room-code-input"
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="เช่น 4829 หรือ ABCD"
              className="w-56 py-2.5 text-center text-3xl font-mono font-black rounded-xl bg-slate-950 border border-sky-500/60 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400 tracking-widest"
            />
          </div>
        </div>
      )}

      {/* Player Customization */}
      <div className="space-y-4 mb-6">
        {/* Name input */}
        <div>
          <label htmlFor="player-name-input" className="block text-xs font-bold text-slate-300 mb-1.5">
            ชื่อของคุณในเกม
          </label>
          <input
            id="player-name-input"
            type="text"
            value={playerName}
            maxLength={15}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="เช่น ต้นกล้า"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Avatar selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            เลือกตัวละครประจำตัว
          </label>
          <div className="grid grid-cols-5 gap-2">
            {PLAYER_AVATARS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => setSelectedAvatar(av)}
                className={`h-11 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                  selectedAvatar === av
                    ? 'bg-amber-500 text-slate-950 scale-105 shadow-md ring-2 ring-white/50'
                    : 'bg-slate-900/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Color selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            เลือกสีประจำตัว
          </label>
          <div className="flex items-center gap-3">
            {PLAYER_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                className={`w-9 h-9 rounded-full transition-transform cursor-pointer shadow-md ${
                  selectedColor === c.hex
                    ? 'ring-4 ring-white/80 scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Action Button */}
      {tab === 'create' ? (
        <button
          type="button"
          onClick={() =>
            onCreateRoom({
              playerName,
              avatar: selectedAvatar,
              color: selectedColor,
            })
          }
          disabled={isLoading || !playerName.trim()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-105 disabled:opacity-50 text-slate-950 font-black text-lg transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span>🚀</span>
          <span>{isLoading ? 'กำลังสร้างห้อง...' : 'สร้างห้องใหม่ & รอเพื่อนจอย'}</span>
          <span>🎲</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            onJoinRoom({
              roomCode: joinCode,
              playerName,
              avatar: selectedAvatar,
              color: selectedColor,
            })
          }
          disabled={isLoading || !joinCode.trim() || !playerName.trim()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 hover:brightness-105 disabled:opacity-50 text-white font-black text-lg transition-all shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span>🔢</span>
          <span>{isLoading ? 'กำลังเข้าร่วม...' : 'เข้าร่วมห้องนี้'}</span>
          <span>🎲</span>
        </button>
      )}
    </div>
  );
};
