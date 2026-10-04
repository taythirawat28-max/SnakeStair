import React from 'react';
import { Player } from '../types/game';

interface PlayerTokenProps {
  player: Player;
  isActive: boolean;
  isMoving?: boolean;
  totalOnTile: number;
  indexOnTile: number;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({
  player,
  isActive,
  isMoving = false,
  totalOnTile,
  indexOnTile,
}) => {
  return (
    <div className={`relative pointer-events-auto group ${isActive || isMoving ? 'z-30' : 'z-20'}`}>
      {/* Name tooltip on hover, active or moving */}
      <div
        className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md whitespace-nowrap pointer-events-none transition-all duration-200 ${
          isActive || isMoving
            ? 'opacity-100 scale-105'
            : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{ backgroundColor: player.color }}
      >
        {player.name}
        {player.isBot ? ' 🤖' : ''}
      </div>

      {/* Token Body */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base shadow-lg border-2 border-white select-none transition-all duration-200 ${
          isMoving
            ? 'scale-125 -translate-y-2 ring-4 ring-white shadow-2xl animate-pulse'
            : isActive
            ? 'animate-bounce ring-4 ring-amber-400 ring-offset-1 ring-offset-slate-900 scale-110'
            : 'hover:scale-110'
        }`}
        style={{
          backgroundColor: player.color,
          boxShadow: isMoving
            ? `0 10px 18px ${player.color}cc`
            : `0 4px 10px ${player.color}88`,
        }}
      >
        <span className="drop-shadow-sm">{player.avatar}</span>
      </div>
    </div>
  );
};

