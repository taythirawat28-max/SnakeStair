import React, { useMemo } from 'react';
import { Player, Snake, Ladder } from '../types/game';
import { getTileCoordinates } from '../utils/gameLogic';
import { PlayerToken } from './PlayerToken';

interface BoardProps {
  players: Player[];
  currentTurnIndex: number;
  snakes: Snake[];
  ladders: Ladder[];
  lastDice?: number | null;
  displayPositions?: Record<string, number>;
  movingPlayerId?: string | null;
  isSlidingOrClimbing?: boolean;
}

export const Board: React.FC<BoardProps> = ({
  players,
  currentTurnIndex,
  snakes,
  ladders,
  displayPositions = {},
  movingPlayerId = null,
  isSlidingOrClimbing = false,
}) => {
  // Generate 100 cells (1 to 100)
  const cells = useMemo(() => {
    const list = [];
    for (let tile = 1; tile <= 100; tile++) {
      const coords = getTileCoordinates(tile);
      const ladderBottom = ladders.find((l) => l.bottom === tile);
      const ladderTop = ladders.find((l) => l.top === tile);
      const snakeHead = snakes.find((s) => s.head === tile);
      const snakeTail = snakes.find((s) => s.tail === tile);

      // Color scheme for cheerful pastel checkered look
      const isAlt = (coords.col + coords.row) % 2 === 0;

      list.push({
        tile,
        coords,
        ladderBottom,
        ladderTop,
        snakeHead,
        snakeTail,
        isAlt,
      });
    }
    return list;
  }, [snakes, ladders]);

  const activePlayer = players[currentTurnIndex];

  return (
    <div className="relative w-full max-w-[560px] aspect-square rounded-2xl p-2 sm:p-3 bg-gradient-to-b from-amber-100 to-amber-200 border-4 border-amber-400/80 shadow-2xl shadow-black/40 overflow-hidden select-none">
      {/* 10x10 Grid Tiles */}
      <div className="relative w-full h-full grid grid-cols-10 grid-rows-10 gap-0.5 sm:gap-1 rounded-xl overflow-hidden bg-amber-300/40 border border-amber-300">
        {cells.map((cell) => {
          const isStart = cell.tile === 1;
          const isFinish = cell.tile === 100;

          // Tile background styles
          let bgClass = cell.isAlt
            ? 'bg-amber-50/90 text-slate-800'
            : 'bg-white/80 text-slate-700';

          if (isStart) {
            bgClass = 'bg-emerald-100 text-emerald-900 border-2 border-emerald-400 font-extrabold';
          } else if (isFinish) {
            bgClass = 'bg-gradient-to-tr from-amber-300 to-yellow-200 text-amber-950 border-2 border-amber-500 font-extrabold shadow-inner';
          } else if (cell.ladderBottom) {
            bgClass = 'bg-sky-50 text-sky-950 border border-sky-300';
          } else if (cell.snakeHead) {
            bgClass = 'bg-rose-50 text-rose-950 border border-rose-300';
          }

          return (
            <div
              key={cell.tile}
              style={{
                gridColumnStart: cell.coords.col + 1,
                gridRowStart: cell.coords.row + 1,
              }}
              className={`relative flex flex-col justify-between p-0.5 sm:p-1 rounded-sm sm:rounded-md transition-colors ${bgClass}`}
            >
              {/* Tile Number */}
              <div className="flex items-center justify-between leading-none">
                <span
                  className={`text-[9px] sm:text-xs font-black ${
                    isFinish
                      ? 'text-amber-800'
                      : isStart
                      ? 'text-emerald-700'
                      : 'text-slate-600'
                  }`}
                >
                  {cell.tile}
                </span>

                {isFinish && (
                  <span className="text-[10px] sm:text-sm animate-pulse" title="เส้นชัย">
                    🏆
                  </span>
                )}
                {isStart && (
                  <span className="text-[9px] sm:text-xs" title="จุดเริ่มต้น">
                    🏁
                  </span>
                )}
              </div>

              {/* Badges for ladders and snakes */}
              <div className="text-center text-[7px] sm:text-[9px] font-bold leading-none mt-auto">
                {cell.ladderBottom && (
                  <span className="inline-block bg-sky-500 text-white rounded px-0.5 py-px shadow-xs scale-90 sm:scale-100">
                    🪜&rarr;{cell.ladderBottom.top}
                  </span>
                )}
                {cell.snakeHead && (
                  <span className="inline-block bg-rose-500 text-white rounded px-0.5 py-px shadow-xs scale-90 sm:scale-100">
                    🐍&darr;{cell.snakeHead.tail}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SVG Overlay for Ladders and Snakes */}
      <svg
        viewBox="0 0 1000 1000"
        className="absolute inset-2 sm:inset-3 pointer-events-none w-[calc(100%-1rem)] sm:w-[calc(100%-1.5rem)] h-[calc(100%-1rem)] sm:h-[calc(100%-1.5rem)] z-10"
      >
        <defs>
          {/* Drop shadow for 3D depth */}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.35" />
          </filter>

          {/* Snake skin gradient */}
          <linearGradient id="snakeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="snakeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          <linearGradient id="snakeGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>

          {/* Ladder wood gradient */}
          <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>

        {/* 1. DRAW LADDERS */}
        {ladders.map((ladder) => {
          const startCoords = getTileCoordinates(ladder.bottom);
          const endCoords = getTileCoordinates(ladder.top);

          const x1 = (startCoords.col + 0.5) * 100;
          const y1 = (startCoords.row + 0.5) * 100;
          const x2 = (endCoords.col + 0.5) * 100;
          const y2 = (endCoords.row + 0.5) * 100;

          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const perpAngle = angle + Math.PI / 2;

          const railOffset = 13;
          const rx = Math.cos(perpAngle) * railOffset;
          const ry = Math.sin(perpAngle) * railOffset;

          // Rail 1
          const r1x1 = x1 - rx;
          const r1y1 = y1 - ry;
          const r1x2 = x2 - rx;
          const r1y2 = y2 - ry;

          // Rail 2
          const r2x1 = x1 + rx;
          const r2y1 = y1 + ry;
          const r2x2 = x2 + rx;
          const r2y2 = y2 + ry;

          // Steps (rungs)
          const stepCount = Math.max(3, Math.floor(dist / 38));
          const rungs = [];
          for (let i = 1; i <= stepCount; i++) {
            const t = i / (stepCount + 1);
            const lx = r1x1 + (r1x2 - r1x1) * t;
            const ly = r1y1 + (r1y2 - r1y1) * t;
            const rxPos = r2x1 + (r2x2 - r2x1) * t;
            const ryPos = r2y1 + (r2y2 - r2y1) * t;
            rungs.push({ lx, ly, rx: rxPos, ry: ryPos });
          }

          return (
            <g key={ladder.id} filter="url(#shadow)" opacity="0.92">
              {/* Rails */}
              <line
                x1={r1x1}
                y1={r1y1}
                x2={r1x2}
                y2={r1y2}
                stroke="url(#woodGrad)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <line
                x1={r2x1}
                y1={r2y1}
                x2={r2x2}
                y2={r2y2}
                stroke="url(#woodGrad)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Rungs */}
              {rungs.map((rung, idx) => (
                <line
                  key={idx}
                  x1={rung.lx}
                  y1={rung.ly}
                  x2={rung.rx}
                  y2={rung.ry}
                  stroke="#fbbf24"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              ))}
              {/* Ladder top star shine */}
              <circle cx={x2} cy={y2} r="9" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              <text
                x={x2}
                y={y2 + 4}
                textAnchor="middle"
                fontSize="10"
                fill="#ffffff"
                fontWeight="bold"
              >
                ★
              </text>
            </g>
          );
        })}

        {/* 2. DRAW SNAKES */}
        {snakes.map((snake, sIdx) => {
          const headCoords = getTileCoordinates(snake.head);
          const tailCoords = getTileCoordinates(snake.tail);

          const hx = (headCoords.col + 0.5) * 100;
          const hy = (headCoords.row + 0.5) * 100;
          const tx = (tailCoords.col + 0.5) * 100;
          const ty = (tailCoords.row + 0.5) * 100;

          // Create organic wavy path
          const dx = tx - hx;
          const dy = ty - hy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const perpAngle = angle + Math.PI / 2;

          // Alternating wave bend
          const waveAmp = (sIdx % 2 === 0 ? 1 : -1) * Math.min(60, dist * 0.28);
          const c1x = hx + dx * 0.3 + Math.cos(perpAngle) * waveAmp;
          const c1y = hy + dy * 0.3 + Math.sin(perpAngle) * waveAmp;
          const c2x = hx + dx * 0.7 - Math.cos(perpAngle) * waveAmp;
          const c2y = hy + dy * 0.7 - Math.sin(perpAngle) * waveAmp;

          const pathD = `M ${hx} ${hy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;

          // Choose snake color
          const grads = ['url(#snakeGrad1)', 'url(#snakeGrad2)', 'url(#snakeGrad3)'];
          const snakeGrad = grads[sIdx % grads.length];

          // Eye angle pointing slightly forward along body
          const eyeDist = 6;
          const eye1x = hx + Math.cos(perpAngle) * eyeDist;
          const eye1y = hy + Math.sin(perpAngle) * eyeDist;
          const eye2x = hx - Math.cos(perpAngle) * eyeDist;
          const eye2y = hy - Math.sin(perpAngle) * eyeDist;

          return (
            <g key={snake.id} filter="url(#shadow)" opacity="0.95">
              {/* Snake body shadow & thickness */}
              <path
                d={pathD}
                fill="none"
                stroke={snakeGrad}
                strokeWidth="15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Snake body spine highlight/spots */}
              <path
                d={pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                strokeDasharray="6 14"
                strokeLinecap="round"
                opacity="0.75"
              />
              {/* Snake head */}
              <circle cx={hx} cy={hy} r="13" fill={snakeGrad} stroke="#ffffff" strokeWidth="1.5" />

              {/* Eyes */}
              <circle cx={eye1x} cy={eye1y} r="3.5" fill="#ffffff" />
              <circle cx={eye1x} cy={eye1y} r="1.5" fill="#0f172a" />
              <circle cx={eye2x} cy={eye2y} r="3.5" fill="#ffffff" />
              <circle cx={eye2x} cy={eye2y} r="1.5" fill="#0f172a" />

              {/* Tiny red tongue */}
              <path
                d={`M ${hx} ${hy} L ${hx - Math.cos(angle) * 14} ${hy - Math.sin(angle) * 14}`}
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Curled Tail Tip */}
              <circle cx={tx} cy={ty} r="5" fill="#f59e0b" />
            </g>
          );
        })}
      </svg>

      {/* Player Tokens Layer with Smooth Step-by-Step Trajectory */}
      <div className="absolute inset-2 sm:inset-3 pointer-events-none w-[calc(100%-1rem)] sm:w-[calc(100%-1.5rem)] h-[calc(100%-1rem)] sm:h-[calc(100%-1.5rem)] z-30">
        {players.map((p) => {
          const tile = displayPositions[p.id] ?? p.position ?? 1;
          const coords = getTileCoordinates(tile);

          // Find players sharing the same current tile
          const playersOnThisTile = players.filter(
            (other) => (displayPositions[other.id] ?? other.position ?? 1) === tile
          );
          const indexOnTile = playersOnThisTile.findIndex((other) => other.id === p.id);
          const totalOnTile = playersOnThisTile.length;

          let offsetX = 0;
          let offsetY = 0;
          if (totalOnTile === 2) {
            offsetX = indexOnTile === 0 ? -10 : 10;
            offsetY = 0;
          } else if (totalOnTile >= 3) {
            const angle = (indexOnTile / totalOnTile) * 2 * Math.PI;
            offsetX = Math.cos(angle) * 11;
            offsetY = Math.sin(angle) * 11;
          }

          const isMovingThis = movingPlayerId === p.id;
          const transitionDuration = isMovingThis && isSlidingOrClimbing ? '600ms' : '220ms';
          const transitionTiming = isMovingThis && isSlidingOrClimbing ? 'ease-in-out' : 'cubic-bezier(0.34, 1.25, 0.64, 1)';

          return (
            <div
              key={p.id}
              className="absolute pointer-events-none"
              style={{
                left: `${coords.xPercent}%`,
                top: `${coords.yPercent}%`,
                transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                zIndex: isMovingThis ? 45 : (activePlayer?.id === p.id ? 35 : 25),
                transitionProperty: 'left, top, transform',
                transitionDuration,
                transitionTimingFunction: transitionTiming,
              }}
            >
              <PlayerToken
                player={p}
                isActive={activePlayer?.id === p.id}
                isMoving={isMovingThis}
                totalOnTile={totalOnTile}
                indexOnTile={indexOnTile}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
