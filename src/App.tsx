import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Player,
  Snake,
  Ladder,
  FloatingReaction,
  LogItem,
} from './types/game';
import { Board } from './components/Board';
import { Dice3D } from './components/Dice3D';
import { TurnIndicator } from './components/TurnIndicator';
import { LocalSetup } from './components/LocalSetup';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { GameLog } from './components/GameLog';
import { sounds } from './utils/audio';
import { calculateMove, generateRandomBoard } from './utils/gameLogic';

export default function App() {
  const [gameStatus, setGameStatus] = useState<'setup' | 'playing' | 'game_over'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const [isSlidingOrClimbing, setIsSlidingOrClimbing] = useState(false);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Initialize random board
  useEffect(() => {
    const board = generateRandomBoard();
    setSnakes(board.snakes);
    setLadders(board.ladders);
  }, []);

  const handleRerollBoard = () => {
    const board = generateRandomBoard();
    setSnakes(board.snakes);
    setLadders(board.ladders);
    sounds.playPop();
  };

  // Sync display positions when players state updates
  useEffect(() => {
    setDisplayPositions((prev) => {
      const next = { ...prev };
      players.forEach((p) => {
        if (movingPlayerId !== p.id) {
          next[p.id] = p.position;
        }
      });
      return next;
    });
  }, [players, movingPlayerId]);

  // Start game with configured local players
  const handleStartGame = (configuredPlayers: Player[]) => {
    setPlayers(configuredPlayers);
    setCurrentTurnIndex(0);
    setDiceValue(null);
    setIsRolling(false);
    setMovingPlayerId(null);
    setWinner(null);
    setLogs([
      {
        id: `start-${Date.now()}`,
        timestamp: Date.now(),
        text: `🎮 เริ่มเกมบันไดงู! ผู้เล่นทั้งหมด ${configuredPlayers.length} คน (ตาแรก: ${configuredPlayers[0].name})`,
        type: 'info',
      },
    ]);

    const initialPositions: Record<string, number> = {};
    configuredPlayers.forEach((p) => {
      initialPositions[p.id] = 1;
    });
    setDisplayPositions(initialPositions);

    setGameStatus('playing');
    sounds.playPop();
  };

  // Step-by-step walking animation runner
  const runStepByStepAnimation = useCallback(async (
    playerId: string,
    steps: { tile: number; type: 'step' | 'ladder' | 'snake' | 'bounce' }[],
    finalTile: number
  ) => {
    setMovingPlayerId(playerId);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const isClimbOrSlide = step.type === 'ladder' || step.type === 'snake';
      setIsSlidingOrClimbing(isClimbOrSlide);

      setDisplayPositions((prev) => ({
        ...prev,
        [playerId]: step.tile,
      }));

      if (step.type === 'ladder') {
        sounds.playLadderClimb();
        await new Promise((r) => setTimeout(r, 650));
      } else if (step.type === 'snake') {
        sounds.playSnakeSlide();
        await new Promise((r) => setTimeout(r, 650));
      } else {
        sounds.playStep();
        await new Promise((r) => setTimeout(r, 230));
      }
    }

    setDisplayPositions((prev) => ({
      ...prev,
      [playerId]: finalTile,
    }));

    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, position: finalTile } : p))
    );

    setIsSlidingOrClimbing(false);
    setMovingPlayerId(null);
  }, []);

  // Roll Dice and Execute Turn
  const handleRollDice = useCallback(() => {
    if (gameStatus !== 'playing' || isRolling || movingPlayerId) return;

    const currentPlayer = players[currentTurnIndex];
    if (!currentPlayer) return;

    setIsRolling(true);
    sounds.playDiceRoll();

    // Generate random dice value 1 - 6
    const rolledDice = Math.floor(Math.random() * 6) + 1;
    setDiceValue(rolledDice);

    // After 900ms roll animation finishes:
    setTimeout(() => {
      setIsRolling(false);

      // Wait 600ms so player clearly sees the dice face:
      setTimeout(async () => {
        const fromTile = currentPlayer.position;
        const moveResult = calculateMove(fromTile, rolledDice, snakes, ladders);

        // Run animated tile hopping
        await runStepByStepAnimation(currentPlayer.id, moveResult.steps, moveResult.finalTile);

        // Log entry
        const turnLogs: LogItem[] = [
          {
            id: `${Date.now()}-dice`,
            timestamp: Date.now(),
            text: `${currentPlayer.name} ทอดลูกเต๋าได้ ${rolledDice} 🎲`,
            type: 'dice',
            playerName: currentPlayer.name,
            playerColor: currentPlayer.color,
          },
        ];

        if (moveResult.special === 'ladder') {
          turnLogs.push({
            id: `${Date.now()}-ladder`,
            timestamp: Date.now(),
            text: `🪜 ว้าว! ${currentPlayer.name} ตกช่องบันได ปีนขึ้นไปช่อง ${moveResult.finalTile}!`,
            type: 'ladder',
            playerName: currentPlayer.name,
            playerColor: currentPlayer.color,
          });
        } else if (moveResult.special === 'snake') {
          turnLogs.push({
            id: `${Date.now()}-snake`,
            timestamp: Date.now(),
            text: `🐍 อุ๊ย! ${currentPlayer.name} ตกหัวงู โดนดูดลงมาช่อง ${moveResult.finalTile}!`,
            type: 'snake',
            playerName: currentPlayer.name,
            playerColor: currentPlayer.color,
          });
        }

        setLogs((prev) => [...turnLogs, ...prev]);

        // Check Victory (Tile 100)
        if (moveResult.reachedFinish) {
          setWinner(currentPlayer);
          setGameStatus('game_over');
          setLogs((prev) => [
            {
              id: `${Date.now()}-win`,
              timestamp: Date.now(),
              text: `🏆 ยินดีด้วย! ${currentPlayer.name} ถึงช่อง 100 เป็นผู้ชนะ! 🎉`,
              type: 'win',
              playerName: currentPlayer.name,
              playerColor: currentPlayer.color,
            },
            ...prev,
          ]);
          return;
        }

        // Advance to next player's turn
        const nextIndex = (currentTurnIndex + 1) % players.length;
        setCurrentTurnIndex(nextIndex);
      }, 600);
    }, 900);
  }, [gameStatus, isRolling, movingPlayerId, players, currentTurnIndex, snakes, ladders, runStepByStepAnimation]);

  // Handle Bot Auto-Roll with safe delay
  useEffect(() => {
    if (gameStatus !== 'playing' || isRolling || movingPlayerId) return;

    const currentPlayer = players[currentTurnIndex];
    if (currentPlayer && currentPlayer.isBot) {
      const timer = setTimeout(() => {
        handleRollDice();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, isRolling, movingPlayerId, players, currentTurnIndex, handleRollDice]);

  // Quick In-Game Reactions
  const handleSendReaction = (emoji: string) => {
    const activePlayer = players[currentTurnIndex] || players[0];
    const reaction: FloatingReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      senderName: activePlayer.name,
      senderColor: activePlayer.color,
      x: 35 + Math.random() * 30,
    };

    sounds.playPop();
    setFloatingReactions((prev) => [...prev, reaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2500);
  };

  // Sound Toggle
  const toggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsSoundMuted(nextMuted);
  };

  // Restart match with same players
  const handleRestartMatch = () => {
    const resetPlayers = players.map((p) => ({ ...p, position: 1 }));
    handleStartGame(resetPlayers);
  };

  // Return to Setup Screen
  const handleReturnToSetup = () => {
    setGameStatus('setup');
    setWinner(null);
  };

  const currentPlayer = players[currentTurnIndex];
  const canRollNow = gameStatus === 'playing' && !isRolling && !movingPlayerId && !currentPlayer?.isBot;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Header Bar */}
      <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        {/* Brand / Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-xl shadow-md shadow-amber-500/20">
            🎲
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg text-white leading-tight">
              บันไดงู (เล่นในเครื่องเดียวกัน)
            </h1>
            <p className="text-[11px] text-amber-400 font-medium">
              {gameStatus === 'playing'
                ? `กำลังเล่น (${players.length} คน) • ตาของ ${currentPlayer?.name}`
                : 'Pass & Play สำหรับ 2-4 คน'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {gameStatus === 'playing' && (
            <>
              {/* Restart current match */}
              <button
                type="button"
                onClick={handleRestartMatch}
                title="เริ่มเกมใหม่ด้วยผู้เล่นเดิม"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">เริ่มใหม่</span>
              </button>

              {/* Change player setup */}
              <button
                type="button"
                onClick={handleReturnToSetup}
                title="กลับไปหน้าตั้งค่าผู้เล่น"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>👥</span>
                <span className="hidden sm:inline">ตั้งค่าผู้เล่น</span>
              </button>
            </>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={isSoundMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-base transition-colors cursor-pointer"
          >
            {isSoundMuted ? '🔇' : '🔊'}
          </button>

          {/* Rules Modal Button */}
          <button
            type="button"
            onClick={() => setIsRulesOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>📜</span>
            <span className="hidden sm:inline">วิธีเล่น</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl flex-1 p-3 sm:p-5 flex flex-col items-center justify-center mx-auto">
        {gameStatus === 'setup' ? (
          /* Setup Screen for Same-Device Local Play */
          <LocalSetup
            onStartGame={handleStartGame}
            onRerollBoard={handleRerollBoard}
            laddersCount={ladders.length}
            snakesCount={snakes.length}
          />
        ) : (
          /* Active Playing Game View */
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5 sm:gap-7">
            {/* Left Column: 10x10 Snakes and Ladders Board */}
            <div className="w-full max-w-[560px] flex flex-col items-center">
              <Board
                players={players}
                currentTurnIndex={currentTurnIndex}
                snakes={snakes}
                ladders={ladders}
                displayPositions={displayPositions}
                movingPlayerId={movingPlayerId}
                isSlidingOrClimbing={isSlidingOrClimbing}
              />

              {/* In-game quick reaction bar */}
              <div className="flex items-center gap-2 mt-3 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-md">
                <span className="text-xs text-slate-400 font-bold mr-1">ส่งเสียงเชียร์:</span>
                {['🎉', '👏', '🐍', '🪜', '🔥', '😱', '🎲'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="text-lg hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Game Controller & Dashboard */}
            <div className="w-full max-w-md flex flex-col gap-4">
              {/* Turn Indicator Banner */}
              <TurnIndicator
                players={players}
                currentTurnIndex={currentTurnIndex}
                isRolling={isRolling}
                diceValue={diceValue}
              />

              {/* 3D Dice Controller */}
              <Dice3D
                value={diceValue}
                isRolling={isRolling}
                canRoll={canRollNow}
                onRoll={handleRollDice}
                playerColor={currentPlayer?.color || '#f59e0b'}
                isMyTurn={!currentPlayer?.isBot}
                activePlayerName={currentPlayer ? currentPlayer.name : ''}
              />

              {/* Game Log / Turn History & Reactions */}
              <GameLog
                logs={logs}
                reactions={floatingReactions}
                onSendReaction={handleSendReaction}
              />
            </div>
          </div>
        )}
      </main>

      {/* Game Over / Victory Modal */}
      {gameStatus === 'game_over' && winner && (
        <GameOverModal
          winner={winner}
          players={players}
          onRestart={handleRestartMatch}
          onLeave={handleReturnToSetup}
          isHost={true}
        />
      )}

      {/* Rules / Guide Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
