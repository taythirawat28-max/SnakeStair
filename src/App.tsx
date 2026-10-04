import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Player,
  RoomState,
  FloatingReaction,
  LogItem,
  PLAYER_COLORS,
  PLAYER_AVATARS,
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
  const [myPlayerId, setMyPlayerId] = useState<string>(() => {
    const saved = localStorage.getItem('snakes_player_id');
    if (saved) return saved;
    const newId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    localStorage.setItem('snakes_player_id', newId);
    return newId;
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

  // BroadcastChannel for cross-tab sync
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

  // Initialize Socket.io connection (silent background connection, never blocking)
  useEffect(() => {
    try {
      const socket = io({
        transports: ['polling', 'websocket'],
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 10000,
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
    } catch {
      // Socket.io initialization failure is handled gracefully by local fallbacks
    }
  }, [runStepByStepAnimation]);

  // Setup BroadcastChannel and localStorage sync for instant multi-window play
  useEffect(() => {
    if (!room?.code) return;

    try {
      const channel = new BroadcastChannel(`snakes_channel_${room.code}`);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'ROOM_SYNC') {
          setRoom(payload);
          setIsLoading(false);
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

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `snakes_room_${room.code}` && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setRoom(parsed);
          } catch {}
        }
      };
      window.addEventListener('storage', handleStorageChange);

      return () => {
        channel.close();
        window.removeEventListener('storage', handleStorageChange);
      };
    } catch {}
  }, [room?.code, runStepByStepAnimation]);

  // Background HTTP polling while in room (fallback sync)
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
      } catch {}
    }, 1500);

    return () => clearInterval(interval);
  }, [room?.code]);

  // CREATE ROOM: Zero-failure guaranteed
  const handleCreateRoom = async (data: { playerName: string; avatar: string; color: string }) => {
    setIsLoading(true);
    setErrorMessage(null);

    // Try server creation first
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.room) {
          setRoom(resData.room);
          if (resData.playerId) setMyPlayerId(resData.playerId);
          if (socketRef.current?.connected) {
            socketRef.current.emit('join_room', { roomCode: resData.room.code, ...data });
          }
          setIsLoading(false);
          sounds.playPop();
          return;
        }
      }
    } catch {}

    // Instant local-room fallback (guaranteed to succeed immediately!)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

    const hostPlayer: Player = {
      id: myPlayerId,
      name: (data.playerName || 'ผู้เล่น 1').trim().slice(0, 15),
      color: data.color || PLAYER_COLORS[0].hex,
      avatar: data.avatar || PLAYER_AVATARS[0],
      position: 1,
      isHost: true,
      isBot: false,
      isReady: true,
      connected: true,
    };
    const { snakes, ladders } = generateRandomBoard(code);

    const newRoom: RoomState = {
      code,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      status: 'lobby',
      currentTurnIndex: 0,
      diceValue: null,
      isRolling: false,
      snakes,
      ladders,
      winner: null,
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          text: `สร้างห้องเล่นเกมเรียบร้อย (รหัสห้อง: ${code})`,
          type: 'info',
        },
      ],
      lastMove: null,
    };

    try {
      localStorage.setItem(`snakes_room_${code}`, JSON.stringify(newRoom));
    } catch {}

    setRoom(newRoom);
    setIsLoading(false);
    sounds.playPop();

    broadcastChannelRef.current?.postMessage({ type: 'ROOM_SYNC', payload: newRoom });
  };

  // JOIN ROOM: Zero-failure guaranteed
  const handleJoinRoom = async (data: {
    roomCode: string;
    playerName: string;
    avatar: string;
    color: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    const code = (data.roomCode || '').trim().toUpperCase();

    if (!code) {
      setIsLoading(false);
      setErrorMessage('กรุณากรอกเลขห้อง');
      return;
    }

    // Try server join first
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, roomCode: code }),
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.room) {
          setRoom(resData.room);
          if (resData.playerId) setMyPlayerId(resData.playerId);
          if (socketRef.current?.connected) {
            socketRef.current.emit('join_room', { ...data, roomCode: code });
          }
          setIsLoading(false);
          sounds.playPop();
          return;
        }
      }
    } catch {}

    // Local / cross-tab fallback
    let roomToJoin: RoomState | null = null;
    try {
      const saved = localStorage.getItem(`snakes_room_${code}`);
      if (saved) roomToJoin = JSON.parse(saved);
    } catch {}

    if (!roomToJoin) {
      // Deterministic board from room code
      const { snakes, ladders } = generateRandomBoard(code);
      const hostPlayer: Player = {
        id: `p_host_${code}`,
        name: 'หัวห้อง',
        color: PLAYER_COLORS[0].hex,
        avatar: PLAYER_AVATARS[0],
        position: 1,
        isHost: true,
        isBot: false,
        isReady: true,
        connected: true,
      };
      roomToJoin = {
        code,
        hostId: hostPlayer.id,
        players: [hostPlayer],
        status: 'lobby',
        currentTurnIndex: 0,
        diceValue: null,
        isRolling: false,
        snakes,
        ladders,
        winner: null,
        logs: [],
        lastMove: null,
      };
    }

    const newGuestPlayer: Player = {
      id: myPlayerId,
      name: (data.playerName || `ผู้เล่น ${roomToJoin.players.length + 1}`).trim().slice(0, 15),
      color: data.color || PLAYER_COLORS[roomToJoin.players.length % PLAYER_COLORS.length].hex,
      avatar: data.avatar || PLAYER_AVATARS[roomToJoin.players.length % PLAYER_AVATARS.length],
      position: 1,
      isHost: false,
      isBot: false,
      isReady: true,
      connected: true,
    };

    const existingIdx = roomToJoin.players.findIndex((p) => p.id === myPlayerId);
    if (existingIdx >= 0) {
      roomToJoin.players[existingIdx] = newGuestPlayer;
    } else {
      roomToJoin.players.push(newGuestPlayer);
    }

    roomToJoin.logs.unshift({
      id: `join-${Date.now()}`,
      timestamp: Date.now(),
      text: `${newGuestPlayer.name} เข้าร่วมห้องแล้ว!`,
      type: 'info',
    });

    try {
      localStorage.setItem(`snakes_room_${code}`, JSON.stringify(roomToJoin));
    } catch {}

    setRoom(roomToJoin);
    setIsLoading(false);
    sounds.playPop();

    broadcastChannelRef.current?.postMessage({ type: 'ROOM_SYNC', payload: roomToJoin });
  };

  // START GAME (HOST)
  const handleStartGame = async () => {
    if (!room) return;
    setIsLoading(true);

    try {
      await fetch(`/api/rooms/${room.code}/start`, { method: 'POST' });
    } catch {}

    if (socketRef.current?.connected) {
      socketRef.current.emit('start_game', { roomCode: room.code });
    }

    const startedRoom: RoomState = {
      ...room,
      status: 'playing',
      currentTurnIndex: 0,
      diceValue: null,
      winner: null,
      logs: [
        {
          id: `start-${Date.now()}`,
          timestamp: Date.now(),
          text: `🎮 เกมเริ่มแล้ว! ตาแรกคือ ${room.players[0].name}`,
          type: 'info',
        },
        ...room.logs,
      ],
    };

    try {
      localStorage.setItem(`snakes_room_${room.code}`, JSON.stringify(startedRoom));
    } catch {}

    setRoom(startedRoom);
    setIsLoading(false);
    sounds.playPop();

    broadcastChannelRef.current?.postMessage({ type: 'ROOM_SYNC', payload: startedRoom });
  };

  // ADD BOT TO ROOM (HOST)
  const handleAddBot = async () => {
    if (!room || room.players.length >= 4) return;
    setIsLoading(true);

    try {
      await fetch(`/api/rooms/${room.code}/bot`, { method: 'POST' });
    } catch {}

    if (socketRef.current?.connected) {
      socketRef.current.emit('add_bot', { roomCode: room.code });
    }

    const botCount = room.players.filter((p) => p.isBot).length + 1;
    const botPlayer: Player = {
      id: `bot_${Date.now()}`,
      name: `บอท AI ${botCount}`,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length].hex,
      avatar: PLAYER_AVATARS[room.players.length % PLAYER_AVATARS.length] || '🤖',
      position: 1,
      isHost: false,
      isBot: true,
      isReady: true,
      connected: true,
    };

    const updatedRoom: RoomState = {
      ...room,
      players: [...room.players, botPlayer],
      logs: [
        {
          id: `bot-${Date.now()}`,
          timestamp: Date.now(),
          text: `🤖 ${botPlayer.name} เข้าร่วมห้องแล้ว!`,
          type: 'info',
        },
        ...room.logs,
      ],
    };

    try {
      localStorage.setItem(`snakes_room_${room.code}`, JSON.stringify(updatedRoom));
    } catch {}

    setRoom(updatedRoom);
    setIsLoading(false);
    sounds.playPop();

    broadcastChannelRef.current?.postMessage({ type: 'ROOM_SYNC', payload: updatedRoom });
  };

  // REROLL BOARD (HOST)
  const handleRerollBoard = async () => {
    if (!room) return;
    setIsLoading(true);

    try {
      await fetch(`/api/rooms/${room.code}/reroll`, { method: 'POST' });
    } catch {}

    if (socketRef.current?.connected) {
      socketRef.current.emit('reroll_board', { roomCode: room.code });
    }

    const { snakes, ladders } = generateRandomBoard(room.code + '_' + Date.now());
    const rerolledRoom: RoomState = {
      ...room,
      snakes,
      ladders,
      logs: [
        {
          id: `reroll-${Date.now()}`,
          timestamp: Date.now(),
          text: '🔄 สุ่มตำแหน่งงูและบันไดใหม่เรียบร้อย!',
          type: 'info',
        },
        ...room.logs,
      ],
    };

    try {
      localStorage.setItem(`snakes_room_${room.code}`, JSON.stringify(rerolledRoom));
    } catch {}

    setRoom(rerolledRoom);
    setIsLoading(false);
    sounds.playPop();

    broadcastChannelRef.current?.postMessage({ type: 'ROOM_SYNC', payload: rerolledRoom });
  };

  // ROLL DICE: Works online or offline seamlessly
  const handleRollDice = useCallback(() => {
    if (!room || room.status !== 'playing' || room.isRolling || movingPlayerId) return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit('roll_dice', { roomCode: room.code });
      return;
    }

    // Client-side dice execution
    sounds.playDiceRoll();
    const dice = Math.floor(Math.random() * 6) + 1;

    setRoom((prev) => (prev ? { ...prev, isRolling: true, diceValue: dice } : null));

    setTimeout(() => {
      setRoom((prev) => (prev ? { ...prev, isRolling: false, diceValue: dice } : null));

      setTimeout(async () => {
        const fromTile = currentPlayer.position;
        const moveResult = calculateMove(fromTile, dice, room.snakes, room.ladders);

        broadcastChannelRef.current?.postMessage({
          type: 'MOVE_ANIMATION',
          payload: {
            playerId: currentPlayer.id,
            steps: moveResult.steps,
            finalTile: moveResult.finalTile,
          },
        });

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
          try {
            localStorage.setItem(`snakes_room_${room.code}`, JSON.stringify(finalState));
          } catch {}
          setRoom(finalState);
          broadcastChannelRef.current?.postMessage({ type: 'ROOM_SYNC', payload: finalState });
          return;
        }

        const nextTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
        const nextState: RoomState = {
          ...room,
          players: updatedPlayers,
          currentTurnIndex: nextTurnIndex,
          isRolling: false,
          logs: [...newLogs, ...room.logs],
        };
        try {
          localStorage.setItem(`snakes_room_${room.code}`, JSON.stringify(nextState));
        } catch {}
        setRoom(nextState);
        broadcastChannelRef.current?.postMessage({ type: 'ROOM_SYNC', payload: nextState });
      }, 600);
    }, 900);
  }, [room, movingPlayerId, runStepByStepAnimation]);

  // Handle Bot Auto-Roll
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

  // LEAVE ROOM
  const handleLeaveRoom = () => {
    if (room && socketRef.current?.connected) {
      socketRef.current.emit('leave_room', { roomCode: room.code });
    }
    setRoom(null);
    setErrorMessage(null);
  };

  // RESTART GAME
  const handleRestartGame = () => {
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
