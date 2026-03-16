import React, { useState, useEffect, useRef } from 'react';
import { ClientGameState, ClientCard } from '../types';
import { getSocket } from '../socket';
import CardComponent from './CardComponent';

interface SnapOverlayProps {
  gameState: ClientGameState;
}

type SnapMode = 'idle' | 'snap_own' | 'snap_target';

export default function SnapOverlay({ gameState }: SnapOverlayProps) {
  const [mode, setMode] = useState<SnapMode>('idle');
  const [selectedMyCard, setSelectedMyCard] = useState<number | null>(null);
  const [selectedTargetPlayer, setSelectedTargetPlayer] = useState<string>('');
  const [selectedTargetCard, setSelectedTargetCard] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(100);

  const socket = getSocket();
  const { snapWindow, players, myPlayerId } = gameState;
  const me = players.find(p => p.id === myPlayerId);
  const opponents = players.filter(p => p.id !== myPlayerId);

  useEffect(() => {
    if (!snapWindow) return;
    const interval = setInterval(() => {
      const remaining = snapWindow.expiresAt - Date.now();
      setTimeLeft(Math.max(0, (remaining / 3000) * 100));
    }, 50);
    return () => clearInterval(interval);
  }, [snapWindow]);

  // Reset UI when a new snap window opens
  useEffect(() => {
    setMode('idle');
    setSelectedMyCard(null);
    setSelectedTargetPlayer('');
    setSelectedTargetCard(null);
  }, [snapWindow?.expiresAt]);

  if (!snapWindow) return null;

  const handleSnapOwn = () => {
    if (selectedMyCard === null) return;
    socket.emit('snap', { targetPlayerId: null, targetCardIndex: null, myCardIndex: selectedMyCard });
    setMode('idle');
    setSelectedMyCard(null);
  };

  const handleSnapTarget = () => {
    if (selectedMyCard === null || !selectedTargetPlayer || selectedTargetCard === null) return;
    socket.emit('snap', {
      targetPlayerId: selectedTargetPlayer,
      targetCardIndex: selectedTargetCard,
      myCardIndex: selectedMyCard,
    });
    setMode('idle');
    setSelectedMyCard(null);
    setSelectedTargetCard(null);
  };

  const targetPlayer = players.find(p => p.id === selectedTargetPlayer);

  return (
    <div className="snap-banner">
      {/* Timer bar at top of banner */}
      <div className="snap-banner-timer">
        <div className="snap-banner-timer-fill" style={{ width: `${timeLeft}%` }} />
      </div>

      <div className="snap-banner-body">
        {/* Discarded card */}
        <div className="snap-banner-card">
          <CardComponent card={snapWindow.discardedCard} size="sm" />
        </div>

        <div className="snap-banner-label">SNAP window</div>

        {mode === 'idle' && (
          <div className="snap-banner-actions">
            <button className="btn btn-danger btn-sm" onClick={() => setMode('snap_own')}>
              Snap My Card
            </button>
            {opponents.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setMode('snap_target')}>
                Snap Their Card
              </button>
            )}
          </div>
        )}

        {mode === 'snap_own' && me && (
          <div className="snap-banner-select">
            <span className="snap-banner-hint">Pick your matching card:</span>
            <div className="snap-mini-cards">
              {me.cards.map((_, idx) => (
                <button
                  key={idx}
                  className={`snap-slot-btn ${selectedMyCard === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedMyCard(idx)}
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleSnapOwn} disabled={selectedMyCard === null}>
              Snap!
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setMode('idle'); setSelectedMyCard(null); }}>
              Cancel
            </button>
          </div>
        )}

        {mode === 'snap_target' && (
          <div className="snap-banner-select">
            <span className="snap-banner-hint">Your card to give:</span>
            <div className="snap-mini-cards">
              {me?.cards.map((_, idx) => (
                <button
                  key={idx}
                  className={`snap-slot-btn ${selectedMyCard === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedMyCard(idx)}
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
            <select
              value={selectedTargetPlayer}
              onChange={e => { setSelectedTargetPlayer(e.target.value); setSelectedTargetCard(null); }}
              className="snap-select"
            >
              <option value="">Player…</option>
              {opponents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {targetPlayer && (
              <>
                <span className="snap-banner-hint">Their card:</span>
                <div className="snap-mini-cards">
                  {Array.from({ length: targetPlayer.cardCount }).map((_, idx) => (
                    <button
                      key={idx}
                      className={`snap-slot-btn ${selectedTargetCard === idx ? 'selected' : ''}`}
                      onClick={() => setSelectedTargetCard(idx)}
                    >
                      #{idx + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              className="btn btn-danger btn-sm"
              onClick={handleSnapTarget}
              disabled={selectedMyCard === null || !selectedTargetPlayer || selectedTargetCard === null}
            >
              Snap!
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setMode('idle'); setSelectedMyCard(null); setSelectedTargetCard(null); }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
