import { Room } from './types';
import { v4 as uuidv4 } from 'uuid';

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createRoom(hostId: string, hostName: string, socketId: string): Room {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room: Room = {
    code,
    hostId,
    players: [{ id: hostId, name: hostName, socketId }],
    gameState: null,
    chatMessages: [],
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function addPlayer(room: Room, id: string, name: string, socketId: string): void {
  room.players.push({ id, name, socketId });
}

export function removePlayer(room: Room, socketId: string): void {
  room.players = room.players.filter(p => p.socketId !== socketId);
}

export function getAllRooms(): Map<string, Room> {
  return rooms;
}
