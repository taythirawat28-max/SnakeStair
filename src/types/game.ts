export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
  position: number;
  isHost: boolean;
  isBot?: boolean;
  isReady: boolean;
  rank?: number;
  connected: boolean;
}

export interface Snake {
  id: string;
  head: number;
  tail: number;
}

export interface Ladder {
  id: string;
  bottom: number;
  top: number;
}

export interface MoveStep {
  tile: number;
  type: 'step' | 'ladder' | 'snake' | 'bounce';
}

export interface LastMoveResult {
  playerId: string;
  dice: number;
  from: number;
  steps: MoveStep[];
  finalTile: number;
  special?: 'ladder' | 'snake' | 'bounce';
  reachedFinish: boolean;
}

export interface LogItem {
  id: string;
  timestamp: number;
  text: string;
  type: 'info' | 'dice' | 'ladder' | 'snake' | 'win' | 'chat';
  playerName?: string;
  playerColor?: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  senderColor: string;
  x: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  status: 'lobby' | 'playing' | 'game_over';
  currentTurnIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  snakes: Snake[];
  ladders: Ladder[];
  winner: Player | null;
  logs: LogItem[];
  lastMove: LastMoveResult | null;
}

export const PLAYER_COLORS = [
  { name: 'สีแดงชาด (Crimson)', hex: '#EF4444', ring: 'ring-red-500', bg: 'bg-red-500' },
  { name: 'สีฟ้าคราม (Sky Blue)', hex: '#3B82F6', ring: 'ring-blue-500', bg: 'bg-blue-500' },
  { name: 'สีเขียวมรกต (Emerald)', hex: '#10B981', ring: 'ring-emerald-500', bg: 'bg-emerald-500' },
  { name: 'สีส้มอำพัน (Amber)', hex: '#F59E0B', ring: 'ring-amber-500', bg: 'bg-amber-500' },
];

export const PLAYER_AVATARS = [
  '🦁', '🦊', '🐼', '🐸', '🐯', '🐰', '🦄', '🐶', '🐵', '🐱'
];

export const DEFAULT_LADDERS: Ladder[] = [
  { id: 'l1', bottom: 4, top: 25 },
  { id: 'l2', bottom: 13, top: 46 },
  { id: 'l3', bottom: 21, top: 60 },
  { id: 'l4', bottom: 33, top: 54 },
  { id: 'l5', bottom: 42, top: 63 },
  { id: 'l6', bottom: 50, top: 69 },
  { id: 'l7', bottom: 62, top: 81 },
  { id: 'l8', bottom: 74, top: 92 },
];

export const DEFAULT_SNAKES: Snake[] = [
  { id: 's1', head: 27, tail: 8 },
  { id: 's2', head: 40, tail: 18 },
  { id: 's3', head: 58, tail: 37 },
  { id: 's4', head: 66, tail: 45 },
  { id: 's5', head: 76, tail: 55 },
  { id: 's6', head: 89, tail: 53 },
  { id: 's7', head: 97, tail: 75 },
];
