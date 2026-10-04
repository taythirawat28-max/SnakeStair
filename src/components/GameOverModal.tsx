import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../types/game';
import { sounds } from '../utils/audio';

interface GameOverModalProps {
  winner: Player | null;
  players: Player[];
  isHost: boolean;
  onRestart: () => void;
  onLeave: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  players,
  isHost,
  onRestart,
  onLeave,
}) => {
  useEffect(() => {
    // Play celebratory sound
    sounds.playWin();

    // Trigger confetti cannon!
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  // Sort players by position descending
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === winner?.id) return -1;
    if (b.id === winner?.id) return 1;
    return b.position - a.position;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-800 rounded-3xl border-2 border-amber-400 p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        {/* Top glowing burst */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Crown & Avatar */}
        <div className="relative inline-block my-2">
          <div className="text-4xl sm:text-5xl animate-bounce">👑</div>
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full flex items-center justify-center text-4xl sm:text-5xl shadow-xl border-4 border-amber-300 ring-4 ring-amber-400/50"
            style={{ backgroundColor: winner?.color || '#ef4444' }}
          >
            <span>{winner?.avatar || '🦁'}</span>
          </div>
        </div>

        {/* Winner Announcement */}
        <h2 className="text-2xl sm:text-3xl font-black text-amber-300 mt-3">
          ขอแสดงความยินดี!
        </h2>
        <p className="text-lg sm:text-xl font-bold text-white mt-1">
          <span style={{ color: winner?.color }}>{winner?.name}</span> เป็นผู้ชนะ! 🏆
        </p>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          สามารถเดินถึงช่องที่ 100 ได้สำเร็จเป็นคนแรก
        </p>

        {/* Ranking List */}
        <div className="bg-slate-900/80 rounded-2xl p-4 my-5 border border-slate-700/80 text-left">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            อันดับการแข่งขัน
          </div>
          <div className="space-y-2">
            {sortedPlayers.map((p, idx) => {
              const isWin = p.id === winner?.id;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm ${
                    isWin
                      ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold'
                      : 'bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 font-black text-center text-amber-400">
                      #{idx + 1}
                    </span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-white/60"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.avatar}
                    </div>
                    <span>{p.name}</span>
                  </div>
                  <span className="font-semibold text-slate-400">
                    ช่อง {p.position} / 100
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onRestart}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>🔄</span>
            <span>เล่นใหม่อีกรอบ</span>
          </button>

          <button
            onClick={onLeave}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer"
          >
            ⚙️ ตั้งค่าผู้เล่นใหม่
          </button>
        </div>
      </div>
    </div>
  );
};
