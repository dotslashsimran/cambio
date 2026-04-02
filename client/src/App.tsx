import React, { useState, useEffect } from 'react';
import { getSocket } from './socket';
import { ClientGameState, RoomPlayer } from './types';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

type AppPhase = 'lobby' | 'game';

export default function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('lobby');
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [hostId, setHostId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ playerName: string; message: string; timestamp: number }>>([]);
  const [notification, setNotification] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('cambio-dark') === 'true');

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('cambio-dark', String(darkMode));
  }, [darkMode]);

  const toggleDark = () => setDarkMode(d => !d);

  useEffect(() => {
    const socket = getSocket();

    socket.on('game_state', (state: ClientGameState) => {
      setGameState(state);
      if (state.phase !== 'waiting') {
        setAppPhase('game');
      }
    });

    socket.on('room_update', (data: { players: RoomPlayer[]; hostId: string }) => {
      setRoomPlayers(data.players);
      setHostId(data.hostId);
    });

    socket.on('chat_message', (msg: { playerName: string; message: string; timestamp: number }) => {
      setChatMessages(prev => [...prev.slice(-99), msg]);
    });

    socket.on('snap_notification', (data: { message: string; success: boolean }) => {
      setNotification(data.message);
      setTimeout(() => setNotification(''), 3000);
    });

    socket.on('cambio_called', (data: { callerName: string }) => {
      setNotification(`${data.callerName} called CAMBIO! Everyone gets one more turn!`);
      setTimeout(() => setNotification(''), 4000);
    });

    socket.on('error', (data: { message: string }) => {
      setNotification(`Error: ${data.message}`);
      setTimeout(() => setNotification(''), 3000);
    });

    socket.on('game_reset', () => {
      setGameState(null);
      setAppPhase('lobby');
    });

    return () => {
      socket.off('game_state');
      socket.off('room_update');
      socket.off('chat_message');
      socket.off('snap_notification');
      socket.off('cambio_called');
      socket.off('error');
      socket.off('game_reset');
    };
  }, []);

  const handleJoinedRoom = (playerId: string, code: string) => {
    setMyPlayerId(playerId);
    setRoomCode(code);
  };

  return (
    <div className="app">
      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}

      {appPhase === 'lobby' && (
        <Lobby
          onJoinedRoom={handleJoinedRoom}
          roomPlayers={roomPlayers}
          hostId={hostId}
          myPlayerId={myPlayerId}
          roomCode={roomCode}
          chatMessages={chatMessages}
          darkMode={darkMode}
          onToggleDark={toggleDark}
        />
      )}

      {appPhase === 'game' && gameState && (
        <GameBoard
          gameState={gameState}
          myPlayerId={myPlayerId}
          roomCode={roomCode}
          hostId={hostId}
          chatMessages={chatMessages}
          darkMode={darkMode}
          onToggleDark={toggleDark}
        />
      )}
    </div>
  );
}
