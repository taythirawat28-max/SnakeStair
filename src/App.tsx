import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Player,
  RoomState,
  FloatingReaction,
  PLAYER_COLORS,
  PLAYER_AVATARS,
  DEFAULT_LADDERS,
  DEFAULT_SNAKES,
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
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Step-by-step token movement animation state
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const [isSlidingOrClimbing, setIsSlidingOrClimbing] = useState(false);

  // Local Offline Game Mode state
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Synchronize displayPositions when room updates, without pulling back moving player
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

  // Ensure socket is connected before emitting
  const ensureSocketConnection = async (): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;
    if (socket.connected) return true;

    socket.connect();
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        resolve(Boolean(socketRef.current?.connected));
      }, 2500);

      socket.once('connect', () => {
        clearTimeout(timer);
        resolve(true);
      });
      socket.once('connect_error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  };

  // Initialize Socket.io connection with polling fallback for maximum reliability
  useEffect(() => {
    const socket = io({
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setMyPlayerId(socket.id || '');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    socket.io.on('reconnect', () => {
      setIsConnected(true);
    });

    socket.on('room_updated', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
      setIsLoading(false);
    });

    socket.on('dice_rolling', (data: { playerId: string; dice: number }) => {
      sounds.playDiceRoll();
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          isRolling: true,
          diceValue: data.dice,
        };
      });
    });

    socket.on('dice_landed', (data: { playerId: string; dice: number }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          isRolling: false,
          diceValue: data.dice,
        };
      });
    });

    socket.on('player_moving', (data: {
      playerId: string;
      steps: { tile: number; type: 'step' | 'ladder' | 'snake' | 'bounce' }[];
      finalTile: number;
    }) => {
      runStepByStepAnimation(data.playerId, data.steps, data.finalTile);
    });

    socket.on('reaction_received', (reaction: FloatingReaction) => {
      sounds.playPop();
      setFloatingReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2500);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // CREATE ONLINE ROOM
  const handleCreateRoom = async (data: { playerName: string; avatar: string; color: string }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsLocalMode(false);

    const connected = await ensureSocketConnection();
    if (!connected || !socketRef.current) {
      setIsLoading(false);
      setErrorMessage('ยังไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง หรือเลือกแท็บ "เล่นในเครื่อง"');
      return;
    }

    socketRef.current.emit(
      'create_room',
      data,
      (res: { success: boolean; room?: RoomState; error?: string }) => {
        setIsLoading(false);
        if (res.success && res.room) {
          setRoom(res.room);
          setMyPlayerId(socketRef.current?.id || '');
          sounds.playPop();
        } else {
          setErrorMessage(res.error || 'ไม่สามารถสร้างห้องได้');
        }
      }
    );
  };

  // JOIN ONLINE ROOM
  const handleJoinRoom = async (data: {
    roomCode: string;
    playerName: string;
    avatar: string;
    color: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsLocalMode(false);

    const connected = await ensureSocketConnection();
    if (!connected || !socketRef.current) {
      setIsLoading(false);
      setErrorMessage('ยังไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง หรือเลือกแท็บ "เล่นในเครื่อง"');
      return;
    }

    socketRef.current.emit(
      'join_room',
      data,
      (res: { success: boolean; room?: RoomState; error?: string }) => {
        setIsLoading(false);
        if (res.success && res.room) {
          setRoom(res.room);
          setMyPlayerId(socketRef.current?.id || '');
          sounds.playPop();
        } else {
          setErrorMessage(res.error || 'ไม่สามารถเข้าร่วมห้องได้');
        }
      }
    );
  };

  // START ONLINE GAME (HOST)
  const handleStartGame = () => {
    if (!room || !socketRef.current) return;
    socketRef.current.emit('start_game', { roomCode: room.code });
  };

  // ADD BOT TO ROOM (HOST)
  const handleAddBot = () => {
    if (!room || !socketRef.current) return;
    socketRef.current.emit('add_bot', { roomCode: room.code });
  };

  // REROLL BOARD (HOST)
  const handleRerollBoard = () => {
    if (!room || !socketRef.current) return;
    socketRef.current.emit('reroll_board', { roomCode: room.code });
  };

  // ROLL DICE (ONLINE)
  const handleRollDice = () => {
    if (!room) return;

    if (isLocalMode) {
      handleLocalRollDice();
      return;
    }

    if (!socketRef.current) return;
    socketRef.current.emit('roll_dice', { roomCode: room.code });
  };

  // RESTART GAME (HOST)
  const handleRestartGame = () => {
    if (!room) return;

    if (isLocalMode) {
      const resetPlayers = room.players.map((p) => ({ ...p, position: 1, rank: undefined }));
      setRoom({
        ...room,
        players: resetPlayers,
        status: 'playing',
        currentTurnIndex: 0,
        diceValue: null,
        isRolling: false,
        winner: null,
        lastMove: null,
      });
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit('restart_game', { roomCode: room.code });
    }
  };

  // LEAVE ROOM
  const handleLeaveRoom = () => {
    setRoom(null);
    setIsLocalMode(false);
    setErrorMessage(null);
    if (socketRef.current && isConnected) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  };

  // SEND FLOATING REACTION EMOJI
  const handleSendReaction = (emoji: string) => {
    const me = room?.players.find((p) => p.id === myPlayerId) || {
      name: 'ผู้เล่น',
      color: '#3b82f6',
    };

    if (isLocalMode) {
      const reaction: FloatingReaction = {
        id: `${Date.now()}-${Math.random()}`,
        emoji,
        senderName: me.name,
        senderColor: me.color,
        x: 20 + Math.random() * 60,
      };
      sounds.playPop();
      setFloatingReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2500);
      return;
    }

    if (socketRef.current && room) {
      socketRef.current.emit('send_reaction', {
        roomCode: room.code,
        emoji,
        senderName: me.name,
        senderColor: me.color,
      });
    }
  };

  // START LOCAL OFFLINE GAME
  const handleStartLocalGame = (humanCount: number, botCount: number) => {
    setIsLocalMode(true);
    const localPlayers: Player[] = [];

    // Human players
    for (let i = 0; i < humanCount; i++) {
      localPlayers.push({
        id: `local-player-${i + 1}`,
        name: `ผู้เล่น ${i + 1}`,
        avatar: PLAYER_AVATARS[i % PLAYER_AVATARS.length],
        color: PLAYER_COLORS[i % PLAYER_COLORS.length].hex,
        position: 1,
        isHost: i === 0,
        isBot: false,
        isReady: true,
        connected: true,
      });
    }

    // Bot players
    for (let j = 0; j < botCount; j++) {
      const botIdx = humanCount + j;
      localPlayers.push({
        id: `local-bot-${j + 1}`,
        name: `บอท AI ${j + 1}`,
        avatar: PLAYER_AVATARS[botIdx % PLAYER_AVATARS.length],
        color: PLAYER_COLORS[botIdx % PLAYER_COLORS.length].hex,
        position: 1,
        isHost: false,
        isBot: true,
        isReady: true,
        connected: true,
      });
    }

    const { snakes, ladders } = generateRandomBoard();

    const localRoom: RoomState = {
      code: 'LOCAL',
      hostId: localPlayers[0].id,
      players: localPlayers,
      status: 'playing',
      currentTurnIndex: 0,
      diceValue: null,
      isRolling: false,
      snakes,
      ladders,
      winner: null,
      logs: [
        {
          id: 'log-1',
          timestamp: Date.now(),
          text: '🎮 เริ่มเกมในเครื่องเดียวกัน (Local Mode)',
          type: 'info',
        },
      ],
      lastMove: null,
    };

    setMyPlayerId(localPlayers[0].id);
    setRoom(localRoom);
    sounds.playPop();
  };

  // LOCAL DICE ROLL LOGIC (FOR PASS & PLAY / BOTS)
  const handleLocalRollDice = useCallback(() => {
    if (!room || room.status !== 'playing' || room.isRolling || movingPlayerId) return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer) return;

    sounds.playDiceRoll();
    const dice = Math.floor(Math.random() * 6) + 1;

    // Phase 1: Dice starts tumbling in 3D
    setRoom((prev) => (prev ? { ...prev, isRolling: true, diceValue: dice } : null));

    // Phase 2: Dice finishes rolling and lands after 900ms
    setTimeout(() => {
      setRoom((prev) => (prev ? { ...prev, isRolling: false, diceValue: dice } : null));

      // Phase 3: Pause 600ms so user clearly sees the landed dice face, then start walking!
      setTimeout(async () => {
        const fromTile = currentPlayer.position;
        const moveResult = calculateMove(fromTile, dice, room.snakes, room.ladders);

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
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  players: updatedPlayers,
                  status: 'game_over',
                  winner: currentPlayer,
                  isRolling: false,
                  logs: [...newLogs, ...prev.logs],
                }
              : null
          );
          return;
        }

        // Next turn
        const nextTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                players: updatedPlayers,
                currentTurnIndex: nextTurnIndex,
                isRolling: false,
                logs: [...newLogs, ...prev.logs],
              }
            : null
        );
      }, 600);
    }, 900);
  }, [room, movingPlayerId]);

  // Handle Local Mode Bot Auto-Roll
  useEffect(() => {
    if (!isLocalMode || !room || room.status !== 'playing' || room.isRolling) return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer && currentPlayer.isBot) {
      const timer = setTimeout(() => {
        handleLocalRollDice();
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [isLocalMode, room, handleLocalRollDice]);

  // Sound toggle
  const toggleSound = () => {
    const isMuted = !sounds.toggleMute();
    setIsSoundMuted(isMuted);
  };

  const activePlayer = room?.players[room?.currentTurnIndex || 0];
  const isMyTurn =
    isLocalMode
      ? !activePlayer?.isBot
      : activePlayer?.id === myPlayerId;

  const isHost =
    isLocalMode
      ? true
      : room?.hostId === myPlayerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col items-center">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-6xl px-4 py-3 sm:py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
            🎲
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg text-white leading-tight">
              บันไดงู มัลติเพลเยอร์
            </h1>
            <p className="text-[11px] text-amber-400/90 font-medium">
              Snakes &amp; Ladders Online
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Server Connection Indicator */}
          <button
            onClick={() => {
              if (!isConnected && socketRef.current) {
                socketRef.current.connect();
              }
            }}
            title={isConnected ? 'เชื่อมต่อออนไลน์ปกติ' : 'กดเพื่อลองเชื่อมต่อใหม่'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 cursor-pointer animate-pulse'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>{isConnected ? 'ออนไลน์' : 'ออฟไลน์ (แตะต่อใหม่)'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isSoundMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-base transition-colors cursor-pointer"
          >
            {isSoundMuted ? '🔇' : '🔊'}
          </button>

          {/* Rules Modal Button */}
          <button
            onClick={() => setIsRulesOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>📜</span>
            <span className="hidden sm:inline">วิธีเล่น</span>
          </button>

          {/* Leave Room Button when in Room */}
          {room && (
            <button
              onClick={handleLeaveRoom}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs sm:text-sm font-bold text-rose-300 transition-colors cursor-pointer"
            >
              ออก
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl flex-1 p-3 sm:p-5 flex flex-col items-center justify-center">
        {!room || room.status === 'lobby' ? (
          <Lobby
            roomCode={room?.code}
            isHost={isHost}
            players={room?.players || []}
            onStartGame={handleStartGame}
            onAddBot={handleAddBot}
            onRerollBoard={handleRerollBoard}
            onLeaveRoom={handleLeaveRoom}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartLocalGame={handleStartLocalGame}
            isLoading={isLoading}
            errorMessage={errorMessage}
            snakesCount={room?.snakes.length || 7}
            laddersCount={room?.ladders.length || 8}
            isConnected={isConnected}
            onReconnect={() => socketRef.current?.connect()}
          />
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
                lastDice={room.diceValue}
                displayPositions={displayPositions}
                movingPlayerId={movingPlayerId}
                isSlidingOrClimbing={isSlidingOrClimbing}
              />

              {/* Quick legend under board */}
              <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2">
                <span className="flex items-center gap-1">
                  <span className="text-sm">🪜</span> บันได (ปีนขึ้นบน)
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-sm">🐍</span> งู (สไลด์ถอยหลัง)
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-sm">🏆</span> ถึงช่อง 100 ชนะ
                </span>
              </div>
            </div>

            {/* Right Column: Turn Info, 3D Dice, and Logs */}
            <div className="w-full max-w-md flex flex-col gap-4">
              {/* Turn Banner */}
              <TurnIndicator
                players={room.players}
                currentTurnIndex={room.currentTurnIndex}
                myPlayerId={myPlayerId}
                isRolling={room.isRolling}
                diceValue={room.diceValue}
              />

              {/* 3D Rolling Dice Card */}
              <Dice3D
                value={room.diceValue}
                isRolling={room.isRolling}
                canRoll={isMyTurn && !room.isRolling && !movingPlayerId && room.status === 'playing'}
                onRoll={handleRollDice}
                playerColor={activePlayer?.color}
                isMyTurn={isMyTurn}
                activePlayerName={activePlayer?.name || ''}
              />

              {/* Game Log Feed and Quick Reactions */}
              <GameLog
                logs={room.logs}
                reactions={floatingReactions}
                onSendReaction={handleSendReaction}
              />
            </div>
          </div>
        )}
      </main>

      {/* Game Over Modal */}
      {room?.status === 'game_over' && (
        <GameOverModal
          winner={room.winner}
          players={room.players}
          isHost={isHost}
          onRestart={handleRestartGame}
          onLeave={handleLeaveRoom}
        />
      )}

      {/* Rules & How to play Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
