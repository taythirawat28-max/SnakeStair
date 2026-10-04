import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  Player,
  RoomState,
  DEFAULT_LADDERS,
  DEFAULT_SNAKES,
  PLAYER_COLORS,
  PLAYER_AVATARS,
  LastMoveResult,
  LogItem,
} from './src/types/game.js';
import { calculateMove, generateRandomBoard } from './src/utils/gameLogic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 25000,
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// In-memory rooms repository
const rooms = new Map<string, RoomState>();
const botTimeouts = new Map<string, NodeJS.Timeout>();

function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function addLog(room: RoomState, log: Omit<LogItem, 'id' | 'timestamp'>) {
  const item: LogItem = {
    ...log,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };
  room.logs = [item, ...room.logs.slice(0, 49)];
}

function scheduleBotTurnIfNeeded(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing') return;

  const currentPlayer = room.players[room.currentTurnIndex];
  if (currentPlayer && currentPlayer.isBot && !room.isRolling) {
    // Clear existing timeout if any
    const existing = botTimeouts.get(roomCode);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      executeDiceRoll(roomCode, currentPlayer.id);
    }, 1500);
    botTimeouts.set(roomCode, timeout);
  }
}

function executeDiceRoll(roomCode: string, playerId: string) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing' || room.isRolling) return;

  const currentPlayer = room.players[room.currentTurnIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) return;

  room.isRolling = true;
  const dice = Math.floor(Math.random() * 6) + 1;
  room.diceValue = dice;

  // 1. Broadcast roll starting
  io.to(roomCode).emit('dice_rolling', {
    playerId: currentPlayer.id,
    dice,
  });

  const fromTile = currentPlayer.position;
  const moveResult = calculateMove(fromTile, dice, room.snakes, room.ladders);

  const lastMove: LastMoveResult = {
    playerId: currentPlayer.id,
    dice,
    from: fromTile,
    steps: moveResult.steps,
    finalTile: moveResult.finalTile,
    special: moveResult.special,
    reachedFinish: moveResult.reachedFinish,
  };
  room.lastMove = lastMove;

  // Log the dice roll
  addLog(room, {
    text: `${currentPlayer.name} ทอดลูกเต๋าได้ ${dice} 🎲`,
    type: 'dice',
    playerName: currentPlayer.name,
    playerColor: currentPlayer.color,
  });

  const DICE_ROLL_DURATION = 900; // Duration for dice to spin in 3D
  const PAUSE_AFTER_DICE = 600;   // Pause to clearly display the landed dice face

  // 2. Dice finishes rolling and lands on final number
  setTimeout(() => {
    room.isRolling = false;
    io.to(roomCode).emit('dice_landed', {
      playerId: currentPlayer.id,
      dice,
    });
  }, DICE_ROLL_DURATION);

  // 3. ONLY AFTER the dice has stopped and shown its face, character starts walking
  const walkStartTime = DICE_ROLL_DURATION + PAUSE_AFTER_DICE;

  setTimeout(() => {
    io.to(roomCode).emit('player_moving', {
      playerId: currentPlayer.id,
      from: fromTile,
      steps: moveResult.steps,
      finalTile: moveResult.finalTile,
      special: moveResult.special,
      reachedFinish: moveResult.reachedFinish,
    });
  }, walkStartTime);

  // 4. Calculate walk duration
  const stepTime = 250;
  const specialTime = 700;
  const walkDuration = moveResult.steps.reduce((acc, s) => {
    return acc + (s.type === 'ladder' || s.type === 'snake' ? specialTime : stepTime);
  }, 0);

  // 5. Finalize movement and pass turn when character finishes walking
  const finalizeTime = walkStartTime + walkDuration + 400;

  setTimeout(() => {
    // Update player position on server
    currentPlayer.position = moveResult.finalTile;

    if (moveResult.special === 'ladder') {
      addLog(room, {
        text: `🪜 ว้าว! ${currentPlayer.name} ตกช่องบันได ปีนขึ้นไปช่อง ${moveResult.finalTile}!`,
        type: 'ladder',
        playerName: currentPlayer.name,
        playerColor: currentPlayer.color,
      });
    } else if (moveResult.special === 'snake') {
      addLog(room, {
        text: `🐍 อุ๊ย! ${currentPlayer.name} ตกหัวงู เลื่อนลงไปช่อง ${moveResult.finalTile}!`,
        type: 'snake',
        playerName: currentPlayer.name,
        playerColor: currentPlayer.color,
      });
    }

    if (moveResult.reachedFinish) {
      room.status = 'game_over';
      room.winner = currentPlayer;
      currentPlayer.rank = 1;

      addLog(room, {
        text: `🏆 ยินดีด้วย! ${currentPlayer.name} ถึงช่อง 100 คว้าชัยชนะเป็นคนแรก!`,
        type: 'win',
        playerName: currentPlayer.name,
        playerColor: currentPlayer.color,
      });

      io.to(roomCode).emit('room_updated', room);
      return;
    }

    // Normal turn pass
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    io.to(roomCode).emit('room_updated', room);

    // If next player is bot, roll for them
    scheduleBotTurnIfNeeded(roomCode);
  }, finalizeTime);
}

// Socket handlers
io.on('connection', (socket: Socket) => {
  // CREATE ROOM
  socket.on('create_room', (data: { playerName: string; avatar?: string; color?: string }, callback) => {
    try {
      const code = generateRoomCode();
      const hostColor = data.color || PLAYER_COLORS[0].hex;
      const hostAvatar = data.avatar || PLAYER_AVATARS[0];
      const hostPlayer: Player = {
        id: socket.id,
        name: (data.playerName || 'ผู้เล่น 1').trim().slice(0, 15),
        color: hostColor,
        avatar: hostAvatar,
        position: 1,
        isHost: true,
        isBot: false,
        isReady: true,
        connected: true,
      };

      const { snakes, ladders } = generateRandomBoard();

      const newRoom: RoomState = {
        code,
        hostId: socket.id,
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

      addLog(newRoom, {
        text: `สร้างห้องเล่นเกมเรียบร้อย (รหัสห้อง: ${code})`,
        type: 'info',
      });

      rooms.set(code, newRoom);
      socket.join(code);

      callback({ success: true, room: newRoom });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating room';
      callback({ success: false, error: msg });
    }
  });

  // JOIN ROOM
  socket.on('join_room', (data: { roomCode: string; playerName: string; avatar?: string; color?: string }, callback) => {
    try {
      const code = (data.roomCode || '').trim().toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        return callback({ success: false, error: 'ไม่พบห้องที่ระบุ กรุณาตรวจสอบรหัสห้องอีกครั้ง' });
      }

      if (room.status !== 'lobby') {
        return callback({ success: false, error: 'เกมกำลังดำเนินอยู่ ไม่สามารถเข้าร่วมได้' });
      }

      if (room.players.length >= 4) {
        return callback({ success: false, error: 'ห้องนี้เต็มแล้ว (ผู้เล่นครบ 4 คน)' });
      }

      // Assign color and avatar if not specified or already taken
      const usedColors = new Set(room.players.map((p) => p.color));
      const availableColor = PLAYER_COLORS.find((c) => !usedColors.has(c.hex))?.hex || PLAYER_COLORS[room.players.length % PLAYER_COLORS.length].hex;
      const playerColor = data.color && !usedColors.has(data.color) ? data.color : availableColor;

      const usedAvatars = new Set(room.players.map((p) => p.avatar));
      const availableAvatar = PLAYER_AVATARS.find((a) => !usedAvatars.has(a)) || PLAYER_AVATARS[room.players.length % PLAYER_AVATARS.length];
      const playerAvatar = data.avatar || availableAvatar;

      const newPlayer: Player = {
        id: socket.id,
        name: (data.playerName || `ผู้เล่น ${room.players.length + 1}`).trim().slice(0, 15),
        color: playerColor,
        avatar: playerAvatar,
        position: 1,
        isHost: false,
        isBot: false,
        isReady: true,
        connected: true,
      };

      room.players.push(newPlayer);
      socket.join(code);

      addLog(room, {
        text: `${newPlayer.name} เข้าร่วมห้องแล้ว!`,
        type: 'info',
        playerName: newPlayer.name,
        playerColor: newPlayer.color,
      });

      io.to(code).emit('room_updated', room);
      callback({ success: true, room });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error joining room';
      callback({ success: false, error: msg });
    }
  });

  // START GAME
  socket.on('start_game', (data: { roomCode: string }, callback) => {
    const room = rooms.get(data.roomCode);
    if (!room) return callback?.({ success: false, error: 'Room not found' });
    if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only host can start the game' });

    room.status = 'playing';
    room.currentTurnIndex = 0;
    room.diceValue = null;
    room.winner = null;

    addLog(room, {
      text: `🎮 เกมเริ่มแล้ว! ตาแรกคือ ${room.players[0].name}`,
      type: 'info',
    });

    io.to(room.code).emit('room_updated', room);
    callback?.({ success: true, room });

    scheduleBotTurnIfNeeded(room.code);
  });

  // ROLL DICE
  socket.on('roll_dice', (data: { roomCode: string }) => {
    executeDiceRoll(data.roomCode, socket.id);
  });

  // ADD BOT
  socket.on('add_bot', (data: { roomCode: string }, callback) => {
    const room = rooms.get(data.roomCode);
    if (!room) return callback?.({ success: false, error: 'Room not found' });
    if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only host can add bots' });
    if (room.players.length >= 4) return callback?.({ success: false, error: 'ห้องเต็มแล้ว' });

    const botNames = ['บอทเสือน้อย 🐯', 'บอทหมีแพนด้า 🐼', 'บอทกระต่ายบิน 🐰', 'บอทจิ้งจอก 🦊'];
    const botAvatars = ['🐯', '🐼', '🐰', '🦊'];

    const usedColors = new Set(room.players.map((p) => p.color));
    const availableColor = PLAYER_COLORS.find((c) => !usedColors.has(c.hex))?.hex || PLAYER_COLORS[room.players.length].hex;

    const botIndex = room.players.filter((p) => p.isBot).length;
    const botName = botNames[botIndex % botNames.length];
    const botAvatar = botAvatars[botIndex % botAvatars.length];

    const botPlayer: Player = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: botName,
      color: availableColor,
      avatar: botAvatar,
      position: 1,
      isHost: false,
      isBot: true,
      isReady: true,
      connected: true,
    };

    room.players.push(botPlayer);

    addLog(room, {
      text: `เพิ่ม ${botPlayer.name} เข้าสู่ห้อง`,
      type: 'info',
      playerName: botPlayer.name,
      playerColor: botPlayer.color,
    });

    io.to(room.code).emit('room_updated', room);
    callback?.({ success: true, room });
  });

  // REROLL BOARD (SNAKES & LADDERS)
  socket.on('reroll_board', (data: { roomCode: string }, callback) => {
    const room = rooms.get(data.roomCode);
    if (!room) return callback?.({ success: false, error: 'Room not found' });
    if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only host can reroll board' });

    const { snakes, ladders } = generateRandomBoard();
    room.snakes = snakes;
    room.ladders = ladders;

    addLog(room, {
      text: `🔄 หัวหน้าห้องสุ่มตำแหน่งงูและบันไดใหม่แล้ว!`,
      type: 'info',
    });

    io.to(room.code).emit('room_updated', room);
    callback?.({ success: true, room });
  });

  // RESTART GAME
  socket.on('restart_game', (data: { roomCode: string }, callback) => {
    const room = rooms.get(data.roomCode);
    if (!room) return callback?.({ success: false, error: 'Room not found' });
    if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only host can restart' });

    // Reset player positions and ranks
    room.players.forEach((p) => {
      p.position = 1;
      p.rank = undefined;
    });

    room.status = 'playing';
    room.currentTurnIndex = 0;
    room.diceValue = null;
    room.isRolling = false;
    room.winner = null;
    room.lastMove = null;

    addLog(room, {
      text: `🔄 เริ่มเกมใหม่อีกรอบ! ทุกคนกลับไปที่จุดเริ่มต้นช่อง 1`,
      type: 'info',
    });

    io.to(room.code).emit('room_updated', room);
    callback?.({ success: true, room });

    scheduleBotTurnIfNeeded(room.code);
  });

  // SEND REACTION
  socket.on('send_reaction', (data: { roomCode: string; emoji: string; senderName: string; senderColor: string }) => {
    io.to(data.roomCode).emit('reaction_received', {
      id: `${Date.now()}-${Math.random()}`,
      emoji: data.emoji,
      senderName: data.senderName,
      senderColor: data.senderColor,
      x: 20 + Math.random() * 60, // random x percentage across screen
    });
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    rooms.forEach((room, code) => {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];

        if (room.status === 'lobby') {
          // In lobby, remove the player
          room.players.splice(playerIndex, 1);
          if (player.isHost && room.players.length > 0) {
            // Reassign host
            room.players[0].isHost = true;
            room.hostId = room.players[0].id;
          }
        } else {
          // In playing or game_over, mark disconnected
          player.connected = false;
          // If disconnected during their turn, advance turn
          if (room.status === 'playing' && room.currentTurnIndex === playerIndex) {
            room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
            scheduleBotTurnIfNeeded(code);
          }
        }

        // Check if room has any human connected players
        const hasConnectedHuman = room.players.some((p) => !p.isBot && p.connected);
        if (!hasConnectedHuman && room.players.filter((p) => !p.isBot).length === 0) {
          const timer = botTimeouts.get(code);
          if (timer) clearTimeout(timer);
          botTimeouts.delete(code);
          rooms.delete(code);
        } else {
          addLog(room, {
            text: `${player.name} ออกจากเกมแล้ว`,
            type: 'info',
          });
          io.to(code).emit('room_updated', room);
        }
      }
    });
  });
});

// REST Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roomsCount: rooms.size,
    timestamp: Date.now(),
  });
});

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev mode, mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
