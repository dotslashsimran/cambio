import React, { useState, useRef } from 'react';
import { getSocket } from '../socket';
import { RoomPlayer } from '../types';

interface LobbyProps {
  onJoinedRoom: (playerId: string, roomCode: string) => void;
  roomPlayers: RoomPlayer[];
  hostId: string;
  myPlayerId: string;
  roomCode: string;
  chatMessages: Array<{ playerName: string; message: string; timestamp: number }>;
}

type LobbyView = 'home' | 'waiting';

export default function Lobby({ onJoinedRoom, roomPlayers, hostId, myPlayerId, roomCode, chatMessages }: LobbyProps) {
  const [view, setView] = useState<LobbyView>('home');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinMode, setJoinMode] = useState<'create' | 'join' | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const socket = getSocket();

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Enter your name');
      return;
    }
    socket.emit('create_room', { playerName: playerName.trim() }, (res: { roomCode: string; playerId: string }) => {
      onJoinedRoom(res.playerId, res.roomCode);
      setView('waiting');
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Enter your name');
      return;
    }
    if (!joinCode.trim()) {
      setError('Enter room code');
      return;
    }
    socket.emit('join_room', { roomCode: joinCode.trim().toUpperCase(), playerName: playerName.trim() }, (res: { success: boolean; error?: string; playerId?: string }) => {
      if (res.success && res.playerId) {
        onJoinedRoom(res.playerId, joinCode.trim().toUpperCase());
        setView('waiting');
      } else {
        setError(res.error || 'Failed to join room');
      }
    });
  };

  const handleStartGame = () => {
    socket.emit('start_game', { roomCode });
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('chat_message', { message: chatInput.trim() });
    setChatInput('');
  };

  const isHost = myPlayerId === hostId;
  const canStart = isHost && roomPlayers.length >= 2;

  if (view === 'waiting') {
    return (
      <div className="lobby">
        <div className="lobby-bg-cards" aria-hidden="true">
          {['♠','♥','♦','♣','♠','♥'].map((s, i) => (
            <span key={i} className={`lobby-float lobby-float-${i}`}>{s}</span>
          ))}
        </div>
        <div className="lobby-title">CAMBIO</div>
        <div className="lobby-subtitle">2–6 Players • Lowest Score Wins</div>

        <div className="lobby-panel" style={{ maxWidth: 520 }}>
          <div className="room-code-display">
            <div className="label">Room Code</div>
            <div className="code">{roomCode}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Share this code with friends
            </div>
          </div>

          <div className="player-list">
            <h3>Players ({roomPlayers.length}/6)</h3>
            {roomPlayers.map(p => (
              <div key={p.id} className="player-item">
                <div className="avatar">{p.name.charAt(0).toUpperCase()}</div>
                <div className="name">{p.name}</div>
                {p.id === hostId && <span className="host-badge">HOST</span>}
                {p.id === myPlayerId && p.id !== hostId && (
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>You</span>
                )}
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleStartGame}
              disabled={!canStart}
            >
              {canStart ? 'Start Game' : `Need at least 2 players (${roomPlayers.length}/2)`}
            </button>
          ) : (
            <div className="turn-info" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Waiting for host to start the game...
            </div>
          )}

          <div className="chat-box">
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>Chat</div>
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textAlign: 'center', padding: 8 }}>
                  No messages yet
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="chat-message">
                  <span className="chat-name">{msg.playerName}:</span>
                  {msg.message}
                </div>
              ))}
            </div>
            <form className="chat-input-row" onSubmit={handleChat}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Say something..."
                maxLength={200}
              />
              <button type="submit" className="btn btn-secondary btn-sm">Send</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-bg-cards" aria-hidden="true">
        {['♠','♥','♦','♣','♠','♥'].map((s, i) => (
          <span key={i} className={`lobby-float lobby-float-${i}`}>{s}</span>
        ))}
      </div>
      <div className="lobby-title">CAMBIO</div>
      <div className="lobby-subtitle">The Card Game of Bluffing & Memory</div>

      <div className="lobby-panel">
        {!joinMode ? (
          <>
            <h2>Welcome</h2>
            <div className="form-group">
              <label>Your Name</label>
              <input
                value={playerName}
                onChange={e => { setPlayerName(e.target.value); setError(''); }}
                placeholder="Enter your name"
                maxLength={20}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateRoom(); }}
              />
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>}
            <div className="lobby-actions">
              <button className="btn btn-primary btn-full" onClick={() => { if (!playerName.trim()) { setError('Enter your name first'); return; } setJoinMode('create'); handleCreateRoom(); }}>
                Create Game
              </button>
              <button className="btn btn-secondary btn-full" onClick={() => { if (!playerName.trim()) { setError('Enter your name first'); return; } setJoinMode('join'); }}>
                Join Game
              </button>
            </div>
          </>
        ) : joinMode === 'join' ? (
          <>
            <h2>Join a Game</h2>
            <div className="form-group">
              <label>Your Name</label>
              <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name" maxLength={20} />
            </div>
            <div className="form-group">
              <label>Room Code</label>
              <input
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
                placeholder="e.g. ABCD"
                maxLength={4}
                onKeyDown={e => { if (e.key === 'Enter') handleJoinRoom(); }}
              />
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>}
            <div className="lobby-actions">
              <button className="btn btn-primary btn-full" onClick={handleJoinRoom}>Join</button>
              <button className="btn btn-secondary" onClick={() => { setJoinMode(null); setError(''); }}>Back</button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
