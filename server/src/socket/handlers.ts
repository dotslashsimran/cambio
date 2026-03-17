import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { createRoom, getRoom, addPlayer, removePlayer } from '../rooms';
import {
  createGame,
  peekOwnCard,
  markPeekDone,
  isCurrentPlayer,
  callCambio,
  drawCard,
  replaceCard,
  discardDrawn,
  snap,
  abilityAction,
  buildClientState,
} from '../game/engine';
import { ServerGameState } from '../types';


function broadcastGameState(io: Server, state: ServerGameState): void {
  for (const player of state.players) {
    const clientState = buildClientState(state, player.id);
    io.to(player.socketId).emit('game_state', clientState);
  }
}


export function registerHandlers(io: Server, socket: Socket): void {
  // Create room
  socket.on('create_room', (data: { playerName: string }, callback: Function) => {
    const playerId = uuidv4();
    const room = createRoom(playerId, data.playerName, socket.id);
    socket.data.playerId = playerId;
    socket.data.roomCode = room.code;
    socket.join(room.code);

    callback({ roomCode: room.code, playerId });

    // Notify all in room
    io.to(room.code).emit('room_update', {
      players: room.players,
      hostId: room.hostId,
    });
  });

  // Join room
  socket.on('join_room', (data: { roomCode: string; playerName: string }, callback: Function) => {
    const room = getRoom(data.roomCode.toUpperCase());
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }
    if (room.gameState !== null && room.gameState.phase !== 'waiting') {
      callback({ success: false, error: 'Game already in progress' });
      return;
    }
    if (room.players.length >= 6) {
      callback({ success: false, error: 'Room is full' });
      return;
    }

    const playerId = uuidv4();
    addPlayer(room, playerId, data.playerName, socket.id);
    socket.data.playerId = playerId;
    socket.data.roomCode = room.code;
    socket.join(room.code);

    callback({ success: true, playerId });

    io.to(room.code).emit('room_update', {
      players: room.players,
      hostId: room.hostId,
    });
  });

  // Start game
  socket.on('start_game', (data: { roomCode: string }) => {
    const room = getRoom(data.roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    if (room.hostId !== socket.data.playerId) {
      socket.emit('error', { message: 'Only host can start the game' });
      return;
    }
    if (room.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players' });
      return;
    }

    room.gameState = createGame(room.code, room.players);
    broadcastGameState(io, room.gameState);
  });

  // Initial peek
  socket.on('peek_card', (data: { cardIndex: number }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.gameState) return;

    const result = peekOwnCard(room.gameState, socket.data.playerId, data.cardIndex);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    room.gameState = result.state;
    // Send the peeked card only to the peeking player — brief reveal, not permanent state
    socket.emit('peek_reveal', { cardIndex: data.cardIndex, card: result.card, duration: 2500 });
    broadcastGameState(io, room.gameState);
  });

  socket.on('peek_done', () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.gameState) return;

    room.gameState = markPeekDone(room.gameState, socket.data.playerId);
    broadcastGameState(io, room.gameState);
  });

  // Call cambio
  socket.on('call_cambio', () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.gameState) return;

    const result = callCambio(room.gameState, socket.data.playerId);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    room.gameState = result;
    broadcastGameState(io, room.gameState);
    io.to(room.code).emit('cambio_called', {
      callerName: room.players.find(p => p.id === socket.data.playerId)?.name || 'Someone',
    });
  });

  // Draw card
  socket.on('draw_card', (data: { source: 'deck' | 'discard' }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.gameState) return;

    const result = drawCard(room.gameState, socket.data.playerId, data.source);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    room.gameState = result;
    broadcastGameState(io, room.gameState);
  });

  // Replace card
  socket.on('replace_card', (data: { cardIndex: number }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.gameState) return;

    const result = replaceCard(room.gameState, socket.data.playerId, data.cardIndex);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    room.gameState = result;
    broadcastGameState(io, room.gameState);
  });

  // Discard drawn card
  socket.on('discard_drawn', () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.gameState) return;

    const result = discardDrawn(room.gameState, socket.data.playerId);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    room.gameState = result;
    broadcastGameState(io, room.gameState);
  });

  // Snap
  socket.on('snap', (data: {
    targetPlayerId: string | null;
    targetCardIndex: number | null;
    myCardIndex: number;
  }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.gameState) return;

    const result = snap(
      room.gameState,
      socket.data.playerId,
      data.myCardIndex,
      data.targetPlayerId,
      data.targetCardIndex
    );

    room.gameState = result.state;
    broadcastGameState(io, room.gameState);
    socket.emit('snap_result', { success: result.success, message: result.message });
    io.to(room.code).emit('snap_notification', { message: result.message, success: result.success });
    io.to(room.code).emit('snap_animation', {
      success: result.success,
      snapperId: socket.data.playerId,
      snapperCardIndex: data.myCardIndex,
      targetPlayerId: data.targetPlayerId,
      targetCardIndex: data.targetCardIndex,
    });
  });

  // Ability action
  socket.on('ability_action', (data: { action: string; data: any }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.gameState) return;

    const result = abilityAction(room.gameState, socket.data.playerId, data.action, data.data || {});
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    room.gameState = result;
    broadcastGameState(io, room.gameState);
  });

  // Chat message
  socket.on('chat_message', (data: { message: string }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const msg = {
      playerId: player.id,
      playerName: player.name,
      message: data.message.slice(0, 200),
      timestamp: Date.now(),
    };
    room.chatMessages.push(msg);
    if (room.chatMessages.length > 100) room.chatMessages.shift();

    io.to(room.code).emit('chat_message', msg);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room) return;

    removePlayer(room, socket.id);

    io.to(roomCode).emit('room_update', {
      players: room.players,
      hostId: room.hostId,
    });
  });
}
