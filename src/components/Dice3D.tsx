import React, { useEffect, useState } from 'react';

interface Dice3DProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  playerColor?: string;
  isMyTurn: boolean;
  activePlayerName: string;
}

export const Dice3D: React.FC<Dice3DProps> = ({
  value,
  isRolling,
  canRoll,
  onRoll,
  playerColor = '#3b82f6',
  isMyTurn,
  activePlayerName,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value || 1);
  const [spinDegrees, setSpinDegrees] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update display and rotation based on dice value
  useEffect(() => {
    if (value) {
      setDisplayValue(value);
      // Determine 3D rotations for faces 1-6
      // Standard dice rotations:
      // 1: front (0, 0)
      // 2: right (0, -90)
      // 3: top (-90, 0)
      // 4: bottom (90, 0)
      // 5: left (0, 90)
      // 6: back (0, 180)
      const rotations: Record<number, { x: number; y: number }> = {
        1: { x: 0, y: 0 },
        2: { x: 0, y: -90 },
        3: { x: -90, y: 0 },
        4: { x: 90, y: 0 },
        5: { x: 0, y: 90 },
        6: { x: 0, y: 180 },
      };
      const base = rotations[value] || { x: 0, y: 0 };
      // Add multiple full spins (720 or 1080 deg) for dynamic tumbling
      setSpinDegrees({
        x: base.x + 720 * (Math.random() > 0.5 ? 1 : -1),
        y: base.y + 720 * (Math.random() > 0.5 ? 1 : -1),
      });
    }
  }, [value, isRolling]);

  // Fast random face switcher during roll animation
  useEffect(() => {
    if (!isRolling) return;
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
    }, 80);
    return () => clearInterval(interval);
  }, [isRolling]);

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-xl w-full max-w-sm">
      {/* 3D Dice Container */}
      <div className="relative w-24 h-24 my-2 perspective-800 flex items-center justify-center">
        <div
          className={`w-16 h-16 relative transition-transform duration-500 ease-out transform-style-3d ${
            isRolling ? 'animate-bounce' : ''
          }`}
          style={{
            transform: isRolling
              ? `rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg) scale(1.1)`
              : `rotateX(${spinDegrees.x}deg) rotateY(${spinDegrees.y}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Face 1 (Front) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-inner border border-slate-300 flex items-center justify-center transform translate-z-8">
            <span className="w-3.5 h-3.5 bg-red-600 rounded-full shadow-sm" />
          </div>

          {/* Face 2 (Right) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-inner border border-slate-300 p-2 flex justify-between transform rotate-y-90 translate-z-8">
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm self-start" />
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm self-end" />
          </div>

          {/* Face 3 (Top) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-inner border border-slate-300 p-2 flex justify-between transform rotate-x-90 translate-z-8">
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm self-start" />
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm self-center" />
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm self-end" />
          </div>

          {/* Face 4 (Bottom) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-inner border border-slate-300 p-2 grid grid-cols-2 gap-2 transform -rotate-x-90 translate-z-8">
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm" />
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm justify-self-end" />
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm" />
            <span className="w-3 h-3 bg-slate-800 rounded-full shadow-sm justify-self-end" />
          </div>

          {/* Face 5 (Left) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-inner border border-slate-300 p-2 grid grid-cols-3 grid-rows-3 transform -rotate-y-90 translate-z-8">
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm col-start-1 row-start-1" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm col-start-3 row-start-1 justify-self-end" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm col-start-2 row-start-2 place-self-center" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm col-start-1 row-start-3 self-end" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm col-start-3 row-start-3 place-self-end" />
          </div>

          {/* Face 6 (Back) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-inner border border-slate-300 p-2 grid grid-cols-2 grid-rows-3 gap-1 transform rotate-y-180 translate-z-8">
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm justify-self-end" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm justify-self-end" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm" />
            <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shadow-sm justify-self-end" />
          </div>
        </div>
      </div>

      {/* Result Indicator Badge */}
      <div className="text-center my-1">
        {value && !isRolling ? (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border border-amber-400/60 text-amber-300 font-bold text-sm shadow-lg shadow-amber-500/20 animate-fade-in">
            <span>แต้มที่ได้:</span>
            <span className="text-xl text-white font-black">{value}</span>
            <span className="text-base">🎲</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium h-8 flex items-center justify-center">
            {isRolling ? 'กำลังทอดลูกเต๋า... 🎲' : 'พร้อมทอยลูกเต๋า'}
          </div>
        )}
      </div>

      {/* Roll Action Button */}
      <div className="w-full mt-2">
        {canRoll ? (
          <button
            onClick={onRoll}
            disabled={isRolling}
            style={{ backgroundColor: playerColor }}
            className={`w-full py-3 px-6 rounded-xl font-bold text-white shadow-lg text-base sm:text-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer ${
              isRolling ? 'opacity-70 animate-pulse' : 'hover:brightness-110 animate-bounce'
            }`}
          >
            <span className="text-2xl">🎲</span>
            <span>{isRolling ? 'กำลังทอด...' : 'กดทอดลูกเต๋า!'}</span>
          </button>
        ) : (
          <div className="w-full py-2.5 px-4 rounded-xl bg-slate-700/60 border border-slate-600/50 text-slate-300 text-center text-sm font-medium">
            {isMyTurn ? (
              <span>กำลังเดินตัวละคร...</span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>รอตาของ <strong className="text-amber-300">{activePlayerName}</strong>...</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
