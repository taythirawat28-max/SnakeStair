import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Player,
  RoomState,
  FloatingReaction,
  LogItem,
} from './types/game';
import { Board } from './components/Board';
import { Dice3D } from './components/Dice3D';
import { TurnIndicator } from './components/TurnIndicator';
import { Lobby } from './components/Lobby';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { GameLog } from './components/GameLog';
import { sounds } from './utils/audio';
import { calculateMove, generateRandomBoard } from './utils/gameLogic';

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [copiedCodeToast, setCopiedCodeToast] = useState(false);

  // Step-by-step token movement animation state
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const [isSlidingOrClimbing, setIsSlidingOrClimbing] = useState(false);

  // BroadcastChannel for cross-tab sync if multiple tabs join the same room number
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Synchronize displayPositions when room updates, without pulling back a moving player
  useEffect(() => {
    if (room) {
      setDisplayPositions((prev) => {
        const next = { ...prev };
        room.players.forEach((p) => {
          if (movingPlayerId !== p.id) {
            next[p.id] = p.position;
          }
        });
        return next;
      });
    }
  }, [room, movingPlayerId]);

  // Step-by-step walking animation runner
  const runStepByStepAnimation = async (
    playerId: string,
    steps: { tile: number; type: 'step' | 'ladder' | 'snake' | 'bounce' }[],
    finalTile: number
  ) => {
    setMovingPlayerId(playerId);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const isClimbOrSlide = step.type === 'ladder' || step.type === 'snake';
      setIsSlidingOrClimbing(isClimbOrSlide);

      // Advance token to current tile
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

    // Permanently pin token at finalTile so it NEVER snaps back
    setDisplayPositions((prev) => ({
      ...prev,
      [playerId]: finalTile,
    }));

    // Optimistically update room player position locally
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, position: finalTile } : p
        ),
      };
    });

    setIsSlidingOrClimbing(false);
    setMovingPlayerId(null);
  };

  // Setup BroadcastChannel when room code changes (for cross-tab synchronization with identical room code)
  useEffect(() => {
    if (!room?.code) return;

    try {
      const channelName = `snakes_ladders_${room.code}`;
      const channel = new BroadcastChannel(channelName);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'ROOM_SYNC') {
          setRoom(payload);
        } else if (type === 'MOVE_ANIMATION') {
          runStepByStepAnimation(payload.playerId, payload.steps, payload.finalTile);
        } else if (type === 'REACTION') {
          sounds.playPop();
          setFloatingReactions((prev) => [...prev, payload]);
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== payload.id));
          }, 2500);
        }
      };

      return () => {
        channel.close();
      };
    } catch {
      // BroadcastChannel might not be supported in some embedded webviews, fallback gracefully
    }
  }, [room?.code]);

  // START GAME FROM LOBBY WITH ROOM CODE
  const handleStartGameWithRoom = ({
    roomCode,
    players,
  }: {
    roomCode: string;
    players: { name: string; avatar: string; color: string; isBot: boolean }[];
  }) => {
    const { snakes, ladders } = generateRandomBoard(roomCode);

    const initialPlayers: Player[] = players.map((p, index) => ({
      id: `p-${index + 1}`,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      position: 1,
      isHost: index === 0,
      isBot: p.isBot,
      isReady: true,
      connected: true,
    }));

    const initialPos: Record<string, number> = {};
    initialPlayers.forEach((p) => {
      initialPos[p.id] = 1;
    });
    setDisplayPositions(initialPos);

    const initialLogs: LogItem[] = [
      {
        id: 'init-1',
        timestamp: Date.now(),
        text: `🎲 เข้าห้อง #${roomCode} เริ่มเกมบันไดงู!`,
        type: 'info',
      },
    ];

    const newRoomState: RoomState = {
      code: roomCode,
      hostId: initialPlayers[0].id,
      status: 'playing',
      players: initialPlayers,
      currentTurnIndex: 0,
      diceValue: null,
      isRolling: false,
      snakes,
      ladders,
      winner: null,
      logs: initialLogs,
      lastMove: null,
    };

    setRoom(newRoomState);
    sounds.playPop();

    // Broadcast room init
    broadcastChannelRef.current?.postMessage({
      type: 'ROOM_SYNC',
      payload: newRoomState,
    });
  };

  // DICE ROLL LOGIC
  const handleRollDice = useCallback(() => {
    if (!room || room.status !== 'playing' || room.isRolling || movingPlayerId) return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer) return;

    sounds.playDiceRoll();
    const dice = Math.floor(Math.random() * 6) + 1;

    // Phase 1: Dice starts rolling in 3D
    setRoom((prev) => (prev ? { ...prev, isRolling: true, diceValue: dice } : null));

    // Phase 2: Dice finishes rolling and lands after 900ms
    setTimeout(() => {
      setRoom((prev) => (prev ? { ...prev, isRolling: false, diceValue: dice } : null));

      // Phase 3: Pause 600ms so player sees the landed dice face, then start walking!
      setTimeout(async () => {
        const fromTile = currentPlayer.position;
        const moveResult = calculateMove(fromTile, dice, room.snakes, room.ladders);

        // Broadcast move animation to other tabs if open
        broadcastChannelRef.current?.postMessage({
          type: 'MOVE_ANIMATION',
          payload: {
            playerId: currentPlayer.id,
            steps: moveResult.steps,
            finalTile: moveResult.finalTile,
          },
        });

        // Run step-by-step walking animation across squares!
        await runStepByStepAnimation(currentPlayer.id, moveResult.steps, moveResult.finalTile);

        const updatedPlayers = room.players.map((p, idx) =>
          idx === room.currentTurnIndex ? { ...p, position: moveResult.finalTile } : p
        );

        const newLogs: LogItem[] = [
          {
            id: `${Date.now()}-1`,
            timestamp: Date.now(),
            text: `${currentPlayer.name} ทอดลูกเต๋าได้ ${dice} 🎲`,
            type: 'dice',
            playerName: currentPlayer.name,
            playerColor: currentPlayer.color,
          },
        ];

        if (moveResult.special === 'ladder') {
          newLogs.push({
            id: `${Date.now()}-2`,
            timestamp: Date.now(),
            text: `🪜 ว้าว! ${currentPlayer.name} ตกช่องบันได ปีนขึ้นไปช่อง ${moveResult.finalTile}!`,
            type: 'ladder',
            playerName: currentPlayer.name,
            playerColor: currentPlayer.color,
          });
        } else if (moveResult.special === 'snake') {
          newLogs.push({
            id: `${Date.now()}-2`,
            timestamp: Date.now(),
            text: `🐍 อุ๊ย! ${currentPlayer.name} ตกหัวงู เลื่อนลงไปช่อง ${moveResult.finalTile}!`,
            type: 'snake',
            playerName: currentPlayer.name,
            playerColor: currentPlayer.color,
          });
        }

        if (moveResult.reachedFinish) {
          const finalState: RoomState = {
            ...room,
            players: updatedPlayers,
            status: 'game_over',
            winner: currentPlayer,
            isRolling: false,
            logs: [
              {
                id: `${Date.now()}-win`,
                timestamp: Date.now(),
                text: `🏆 ยินดีด้วย! ${currentPlayer.name} ถึงช่อง 100 ชนะแล้ว!`,
                type: 'win',
                playerName: currentPlayer.name,
                playerColor: currentPlayer.color,
              },
              ...newLogs,
              ...room.logs,
            ],
          };
          setRoom(finalState);
          broadcastChannelRef.current?.postMessage({
            type: 'ROOM_SYNC',
            payload: finalState,
          });
          return;
        }

        // Advance to next player
        const nextTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
        const nextState: RoomState = {
          ...room,
          players: updatedPlayers,
          currentTurnIndex: nextTurnIndex,
          isRolling: false,
          logs: [...newLogs, ...room.logs],
        };

        setRoom(nextState);
        broadcastChannelRef.current?.postMessage({
          type: 'ROOM_SYNC',
          payload: nextState,
        });
      }, 600);
    }, 900);
  }, [room, movingPlayerId]);

  // Handle Bot Auto-Roll on its turn
  useEffect(() => {
    if (!room || room.status !== 'playing' || room.isRolling || movingPlayerId) return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer && currentPlayer.isBot) {
      const timer = setTimeout(() => {
        handleRollDice();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [room, handleRollDice, movingPlayerId]);

  // Sound Toggle
  const toggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsSoundMuted(nextMuted);
  };

  // Copy Room Code
  const handleCopyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCodeToast(true);
    setTimeout(() => setCopiedCodeToast(false), 2000);
  };

  // Exit Room back to Lobby
  const handleLeaveRoom = () => {
    setRoom(null);
  };

  // Play Again (Restart with same players and room code)
  const handlePlayAgain = () => {
    if (!room) return;
    const { snakes, ladders } = generateRandomBoard(room.code + '_next');
    const resetPlayers = room.players.map((p) => ({
      ...p,
      position: 1,
      rank: undefined,
    }));

    const initialPos: Record<string, number> = {};
    resetPlayers.forEach((p) => {
      initialPos[p.id] = 1;
    });
    setDisplayPositions(initialPos);

    const restartedState: RoomState = {
      ...room,
      status: 'playing',
      players: resetPlayers,
      currentTurnIndex: 0,
      diceValue: null,
      isRolling: false,
      winner: null,
      snakes,
      ladders,
      lastMove: null,
      logs: [
        {
          id: `restart-${Date.now()}`,
          timestamp: Date.now(),
          text: '🔄 เริ่มเล่นเกมรอบใหม่แล้ว!',
          type: 'info',
        },
      ],
    };

    setRoom(restartedState);
    broadcastChannelRef.current?.postMessage({
      type: 'ROOM_SYNC',
      payload: restartedState,
    });
  };

  // Reactions
  const handleSendReaction = (emoji: string) => {
    const reaction: FloatingReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      senderName: currentPlayer?.name || 'ผู้เล่น',
      senderColor: currentPlayer?.color || '#f59e0b',
      x: 35 + Math.random() * 30,
    };
    sounds.playPop();
    setFloatingReactions((prev) => [...prev, reaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2500);

    broadcastChannelRef.current?.postMessage({
      type: 'REACTION',
      payload: reaction,
    });
  };

  const currentPlayer = room && room.status === 'playing' ? room.players[room.currentTurnIndex] : null;

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
              บันไดงู (Snakes &amp; Ladders)
            </h1>
            <p className="text-[11px] text-amber-400 font-medium">
              {room ? `ห้อง #${room.code}` : 'จอยเลขห้องเล่นได้ทันที'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Room Code Badge with Copy button when in-game */}
          {room && (
            <button
              type="button"
              onClick={handleCopyRoomCode}
              title="แตะเพื่อคัดลอกเลขห้อง"
              className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span>#{room.code}</span>
              <span className="text-[11px] opacity-80">{copiedCodeToast ? '✓ คัดลอกแล้ว' : '📋'}</span>
            </button>
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

          {/* Leave Room Button when in Room */}
          {room && (
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs sm:text-sm font-bold text-rose-300 transition-colors cursor-pointer"
            >
              เปลี่ยนห้อง
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl flex-1 p-3 sm:p-5 flex flex-col items-center justify-center mx-auto">
        {!room ? (
          <Lobby onStartGameWithRoom={handleStartGameWithRoom} />
        ) : (
          /* Active Game View (Board + Dashboard) */
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5 sm:gap-7">
            {/* Left Column: 10x10 Snakes and Ladders Board */}
            <div className="w-full max-w-[560px] flex flex-col items-center">
              <Board
                players={room.players}
                currentTurnIndex={room.currentTurnIndex}
                snakes={room.snakes}
                ladders={room.ladders}
                displayPositions={displayPositions}
                movingPlayerId={movingPlayerId}
                isSlidingOrClimbing={isSlidingOrClimbing}
              />

              {/* In-game quick reaction bar */}
              <div className="flex items-center gap-2 mt-3 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-md">
                <span className="text-xs text-slate-400 font-bold mr-1">ส่งรีแอคชัน:</span>
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
                players={room.players}
                currentTurnIndex={room.currentTurnIndex}
                myPlayerId={currentPlayer?.id || ''}
                isRolling={room.isRolling}
                diceValue={room.diceValue}
              />

              {/* 3D Dice Controller */}
              <Dice3D
                value={room.diceValue}
                isRolling={room.isRolling}
                canRoll={!room.isRolling && !movingPlayerId && Boolean(currentPlayer && !currentPlayer.isBot)}
                onRoll={handleRollDice}
                playerColor={currentPlayer?.color || '#f59e0b'}
                isMyTurn={Boolean(currentPlayer && !currentPlayer.isBot)}
                activePlayerName={currentPlayer ? currentPlayer.name : ''}
              />

              {/* Game Log / Turn History & Reactions */}
              <GameLog
                logs={room.logs}
                reactions={floatingReactions}
                onSendReaction={handleSendReaction}
              />
            </div>
          </div>
        )}
      </main>

      {/* Game Over / Victory Modal */}
      {room && room.status === 'game_over' && room.winner && (
        <GameOverModal
          winner={room.winner}
          players={room.players}
          onRestart={handlePlayAgain}
          onLeave={handleLeaveRoom}
          isHost={true}
        />
      )}

      {/* Rules / Guide Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
