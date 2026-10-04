import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Player,
  RoomState,
  FloatingReaction,
} from './types/game';
import { Board } from './components/Board';
import { Dice3D } from './components/Dice3D';
import { TurnIndicator } from './components/TurnIndicator';
import { Lobby } from './components/Lobby';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { GameLog } from './components/GameLog';
import { sounds } from './utils/audio';

export default function App() {
  const socketRef = useRef<Socket | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>(() => {
    return localStorage.getItem('snakes_player_id') || `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  });

  const [room, setRoom] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [copiedCodeToast, setCopiedCodeToast] = useState(false);

  // Step-by-step token movement animation state
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const [isSlidingOrClimbing, setIsSlidingOrClimbing] = useState(false);

  // Cross-tab BroadcastChannel for zero-latency local testing
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Persist myPlayerId
  useEffect(() => {
    localStorage.setItem('snakes_player_id', myPlayerId);
  }, [myPlayerId]);

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

  // Token hopping animation
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
  }, []);

  // Initialize Socket.io connection (polling + websocket)
  useEffect(() => {
    const socket = io({
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (socket.id) {
        setMyPlayerId((prev) => prev || socket.id || '');
      }
    });

    socket.on('room_updated', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
      setIsLoading(false);
      setErrorMessage(null);
    });

    socket.on('dice_rolling', (data: { playerId: string; dice: number }) => {
      sounds.playDiceRoll();
      setRoom((prev) => (prev ? { ...prev, isRolling: true, diceValue: data.dice } : null));
    });

    socket.on('dice_landed', (data: { playerId: string; dice: number }) => {
      setRoom((prev) => (prev ? { ...prev, isRolling: false, diceValue: data.dice } : null));
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
  }, [runStepByStepAnimation]);

  // Setup BroadcastChannel for cross-tab sync with same room code
  useEffect(() => {
    if (!room?.code) return;

    try {
      const channel = new BroadcastChannel(`snakes_room_${room.code}`);
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
      // BroadcastChannel optional fallback
    }
  }, [room?.code, runStepByStepAnimation]);

  // Periodic HTTP Polling fallback while in a room (ensures sync even if WebSockets are blocked)
  useEffect(() => {
    if (!room?.code) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${room.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            setRoom((prev) => {
              if (!prev) return data.room;
              // Only update if changes occurred to avoid re-rendering
              if (
                prev.status !== data.room.status ||
                prev.players.length !== data.room.players.length ||
                prev.currentTurnIndex !== data.room.currentTurnIndex ||
                prev.logs.length !== data.room.logs.length
              ) {
                return data.room;
              }
              return prev;
            });
          }
        }
      } catch {
        // Silently ignore network hiccup during polling
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [room?.code]);

  // CREATE ROOM: Creates room on server and opens Waiting Room
  const handleCreateRoom = async (data: { playerName: string; avatar: string; color: string }) => {
    setIsLoading(true);
    setErrorMessage(null);

    // Try via socket first if connected
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('create_room', data, (res: { success: boolean; room?: RoomState; error?: string }) => {
        setIsLoading(false);
        if (res.success && res.room) {
          setRoom(res.room);
          setMyPlayerId(socket.id || '');
          sounds.playPop();
        } else {
          setErrorMessage(res.error || 'ไม่สามารถสร้างห้องได้');
        }
      });
      return;
    }

    // HTTP REST fallback
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      setIsLoading(false);

      if (resData.success && resData.room) {
        setRoom(resData.room);
        if (resData.playerId) setMyPlayerId(resData.playerId);
        sounds.playPop();
      } else {
        setErrorMessage(resData.error || 'ไม่สามารถสร้างห้องได้');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // JOIN ROOM: Joins room on server with room code
  const handleJoinRoom = async (data: {
    roomCode: string;
    playerName: string;
    avatar: string;
    color: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);

    const code = (data.roomCode || '').trim().toUpperCase();

    // Try via socket first if connected
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('join_room', { ...data, roomCode: code }, (res: { success: boolean; room?: RoomState; error?: string }) => {
        setIsLoading(false);
        if (res.success && res.room) {
          setRoom(res.room);
          setMyPlayerId(socket.id || '');
          sounds.playPop();
        } else {
          setErrorMessage(res.error || 'ไม่สามารถเข้าร่วมห้องได้');
        }
      });
      return;
    }

    // HTTP REST fallback
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, roomCode: code }),
      });
      const resData = await res.json();
      setIsLoading(false);

      if (resData.success && resData.room) {
        setRoom(resData.room);
        if (resData.playerId) setMyPlayerId(resData.playerId);
        sounds.playPop();
      } else {
        setErrorMessage(resData.error || 'ไม่สามารถเข้าร่วมห้องได้');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('ไม่สามารถเข้าร่วมห้องได้ กรุณาตรวจสอบรหัสห้อง');
    }
  };

  // START GAME (HOST)
  const handleStartGame = async () => {
    if (!room) return;
    setIsLoading(true);

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('start_game', { roomCode: room.code }, (res: { success: boolean; room?: RoomState; error?: string }) => {
        setIsLoading(false);
        if (res?.success && res.room) {
          setRoom(res.room);
          sounds.playPop();
        }
      });
      return;
    }

    // HTTP REST fallback
    try {
      const res = await fetch(`/api/rooms/${room.code}/start`, { method: 'POST' });
      const resData = await res.json();
      setIsLoading(false);
      if (resData.success && resData.room) {
        setRoom(resData.room);
        sounds.playPop();
      }
    } catch {
      setIsLoading(false);
    }
  };

  // ADD BOT TO ROOM (HOST)
  const handleAddBot = async () => {
    if (!room) return;
    setIsLoading(true);

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('add_bot', { roomCode: room.code }, (res: { success: boolean; room?: RoomState }) => {
        setIsLoading(false);
        if (res?.success && res.room) {
          setRoom(res.room);
          sounds.playPop();
        }
      });
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${room.code}/bot`, { method: 'POST' });
      const resData = await res.json();
      setIsLoading(false);
      if (resData.success && resData.room) {
        setRoom(resData.room);
        sounds.playPop();
      }
    } catch {
      setIsLoading(false);
    }
  };

  // REROLL BOARD (HOST)
  const handleRerollBoard = async () => {
    if (!room) return;
    setIsLoading(true);

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('reroll_board', { roomCode: room.code });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${room.code}/reroll`, { method: 'POST' });
      const resData = await res.json();
      setIsLoading(false);
      if (resData.success && resData.room) {
        setRoom(resData.room);
      }
    } catch {
      setIsLoading(false);
    }
  };

  // ROLL DICE
  const handleRollDice = () => {
    if (!room || room.status !== 'playing' || room.isRolling || movingPlayerId) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit('roll_dice', { roomCode: room.code });
      return;
    }
  };

  // LEAVE ROOM
  const handleLeaveRoom = () => {
    if (room && socketRef.current?.connected) {
      socketRef.current.emit('leave_room', { roomCode: room.code });
    }
    setRoom(null);
    setErrorMessage(null);
  };

  // RESTART GAME (WHEN FINISHED)
  const handleRestartGame = () => {
    if (!room) return;
    handleStartGame();
  };

  // REACTIONS
  const handleSendReaction = (emoji: string) => {
    if (!room) return;
    const me = room.players.find((p) => p.id === myPlayerId) || room.players[0];

    const reaction: FloatingReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      senderName: me?.name || 'ผู้เล่น',
      senderColor: me?.color || '#f59e0b',
      x: 35 + Math.random() * 30,
    };

    sounds.playPop();
    setFloatingReactions((prev) => [...prev, reaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2500);

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_reaction', { roomCode: room.code, emoji });
    }
    broadcastChannelRef.current?.postMessage({ type: 'REACTION', payload: reaction });
  };

  // COPY ROOM CODE
  const handleCopyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCodeToast(true);
    setTimeout(() => setCopiedCodeToast(false), 2000);
  };

  // Sound Toggle
  const toggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsSoundMuted(nextMuted);
  };

  const currentPlayer = room && room.status === 'playing' ? room.players[room.currentTurnIndex] : null;
  const isMyTurn = Boolean(currentPlayer && currentPlayer.id === myPlayerId && !currentPlayer.isBot);
  const isHost = Boolean(room && (room.hostId === myPlayerId || room.players[0]?.id === myPlayerId));

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
              บันไดงู มัลติเพลเยอร์
            </h1>
            <p className="text-[11px] text-amber-400 font-medium">
              {room ? `ห้อง #${room.code} (${room.players.length} คน)` : 'สร้างห้องรอเพื่อน หรือ จอยเลขห้อง'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Room Code Badge with Copy button when in room */}
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
              ออกจากห้อง
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl flex-1 p-3 sm:p-5 flex flex-col items-center justify-center mx-auto">
        {!room || room.status === 'lobby' ? (
          /* Lobby: Shows Create/Join tabs when no room, or Waiting Room when status === 'lobby' */
          <Lobby
            room={room}
            myPlayerId={myPlayerId}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartGame={handleStartGame}
            onAddBot={handleAddBot}
            onRerollBoard={handleRerollBoard}
            onLeaveRoom={handleLeaveRoom}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        ) : (
          /* Active Playing Game View */
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
                myPlayerId={myPlayerId}
                isRolling={room.isRolling}
                diceValue={room.diceValue}
              />

              {/* 3D Dice Controller */}
              <Dice3D
                value={room.diceValue}
                isRolling={room.isRolling}
                canRoll={!room.isRolling && !movingPlayerId && isMyTurn}
                onRoll={handleRollDice}
                playerColor={currentPlayer?.color || '#f59e0b'}
                isMyTurn={isMyTurn}
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
          onRestart={handleRestartGame}
          onLeave={handleLeaveRoom}
          isHost={isHost}
        />
      )}

      {/* Rules / Guide Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
