import React, { useState, useEffect, useRef } from 'react';
import { ClientGameState, ClientCard } from '../types';
import { getSocket } from '../socket';
import PlayerArea from './PlayerArea';
import CardComponent from './CardComponent';
import ActionPanel from './ActionPanel';
import AbilityModal from './AbilityModal';
import GameOver from './GameOver';

interface GameBoardProps {
  gameState: ClientGameState;
  myPlayerId: string;
  roomCode: string;
  chatMessages: Array<{ playerName: string; message: string; timestamp: number }>;
}

// When snapping an opponent's card, we need the player to pick which of their own cards to give
interface PendingOpponentSnap {
  targetPlayerId: string;
  targetCardIndex: number;
  targetPlayerName: string;
}

export default function GameBoard({ gameState, myPlayerId, roomCode, chatMessages }: GameBoardProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [tempRevealedCards, setTempRevealedCards] = useState<Record<number, ClientCard>>({});
  const [peekedIndices, setPeekedIndices] = useState<Set<number>>(new Set());
  const [pendingOpponentSnap, setPendingOpponentSnap] = useState<PendingOpponentSnap | null>(null);
  const [snapMessage, setSnapMessage] = useState<{ text: string; success: boolean } | null>(null);
  const peekTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const socket = getSocket();

  useEffect(() => {
    if (gameState.phase !== 'peek') {
      setPeekedIndices(new Set());
      setTempRevealedCards({});
    }
  }, [gameState.phase]);

  useEffect(() => {
    const handlePeekReveal = ({ cardIndex, card, duration }: { cardIndex: number; card: ClientCard; duration: number }) => {
      setPeekedIndices(prev => new Set([...prev, cardIndex]));
      setTempRevealedCards(prev => ({ ...prev, [cardIndex]: card }));
      if (peekTimers.current[cardIndex]) clearTimeout(peekTimers.current[cardIndex]);
      peekTimers.current[cardIndex] = setTimeout(() => {
        setTempRevealedCards(prev => {
          const next = { ...prev };
          delete next[cardIndex];
          return next;
        });
        delete peekTimers.current[cardIndex];
      }, duration);
    };

    const handleSnapResult = ({ success, message }: { success: boolean; message: string }) => {
      setSnapMessage({ text: message, success });
      setTimeout(() => setSnapMessage(null), 2500);
    };

    socket.on('peek_reveal', handlePeekReveal);
    socket.on('snap_result', handleSnapResult);
    return () => {
      socket.off('peek_reveal', handlePeekReveal);
      socket.off('snap_result', handleSnapResult);
    };
  }, [socket]);

  const { phase, players, deckSize, discardPileTop, currentPlayerIndex, drawnCard, abilityState, cambioCalledBy } = gameState;

  const me = players.find(p => p.id === myPlayerId)!;
  const opponents = players.filter(p => p.id !== myPlayerId);
  const isMyTurn = me?.isCurrentTurn ?? false;
  const canSnap = (phase === 'playing' || phase === 'last_turns') && !!discardPileTop;

  useEffect(() => {
    setSelectedCardIndex(null);
    setPendingOpponentSnap(null);
  }, [currentPlayerIndex, phase]);

  // Double-click my own card → snap attempt
  const handleMyCardDoubleClick = (index: number) => {
    if (!canSnap) return;
    socket.emit('snap', { targetPlayerId: null, targetCardIndex: null, myCardIndex: index });
  };

  const handleMyCardClick = (index: number) => {
    if (phase === 'peek') {
      if (!peekedIndices.has(index) && peekedIndices.size < 2) {
        socket.emit('peek_card', { cardIndex: index });
      }
      return;
    }

    // If we're in the middle of picking a card to give after snapping an opponent
    if (pendingOpponentSnap) {
      socket.emit('snap', {
        targetPlayerId: pendingOpponentSnap.targetPlayerId,
        targetCardIndex: pendingOpponentSnap.targetCardIndex,
        myCardIndex: index,
      });
      setPendingOpponentSnap(null);
      return;
    }

    if (!isMyTurn) return;
    if (phase === 'playing' || phase === 'last_turns') {
      if (drawnCard !== null) {
        setSelectedCardIndex(prev => prev === index ? null : index);
      }
    }
  };

  // Double-click opponent card → snap attempt (then must pick card to give)
  const handleOpponentCardDoubleClick = (playerId: string, playerName: string, cardIndex: number) => {
    if (!canSnap) return;
    setPendingOpponentSnap({ targetPlayerId: playerId, targetCardIndex: cardIndex, targetPlayerName: playerName });
  };

  const handleDrawDeck = () => socket.emit('draw_card', { source: 'deck' });
  const handleDrawDiscard = () => socket.emit('draw_card', { source: 'discard' });

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('chat_message', { message: chatInput.trim() });
    setChatInput('');
  };

  const myPeekedCount = peekedIndices.size;

  const phaseLabel: Record<string, string> = {
    waiting: 'Waiting', peek: 'Peek Phase', playing: 'Playing',
    ability: 'Ability', last_turns: 'Final Turns', game_over: 'Game Over',
  };

  return (
    <div className="game-board">
      {/* Header */}
      <div className="game-header">
        <div className="title">CAMBIO</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {cambioCalledBy && (
            <div className="status-badge status-cambio">
              CAMBIO CALLED • {gameState.lastTurnsLeft} turns left
            </div>
          )}
          <div className={`phase-badge phase-${phase}`}>{phaseLabel[phase] ?? phase}</div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Room: {roomCode}</div>
      </div>

      {/* Snap result toast */}
      {snapMessage && (
        <div className={`snap-toast ${snapMessage.success ? 'snap-toast-success' : 'snap-toast-fail'}`}>
          {snapMessage.text}
        </div>
      )}

      {/* Pending opponent snap prompt */}
      {pendingOpponentSnap && (
        <div className="snap-pick-prompt">
          <span>Snapping <strong>{pendingOpponentSnap.targetPlayerName}</strong>'s card — pick one of your cards to give them:</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPendingOpponentSnap(null)}>Cancel</button>
        </div>
      )}

      {/* Opponents */}
      <div className="opponents-area">
        {opponents.map(opp => (
          <PlayerArea
            key={opp.id}
            player={opp}
            isMe={false}
            size="sm"
            onCardDoubleClick={canSnap ? (idx) => handleOpponentCardDoubleClick(opp.id, opp.name, idx) : undefined}
          />
        ))}
      </div>

      {/* Center: piles */}
      <div className="center-area">
        <div className="pile-area">
          <div className="pile-container">
            <div className="pile-label">Deck</div>
            <CardComponent
              faceDown={true}
              size="lg"
              onClick={isMyTurn && !drawnCard && (phase === 'playing' || phase === 'last_turns') ? handleDrawDeck : undefined}
              disabled={!isMyTurn || !!drawnCard || (phase !== 'playing' && phase !== 'last_turns')}
            />
            <div className="pile-count">{deckSize} cards</div>
          </div>

          <div className="pile-container">
            <div className="pile-label">Discard</div>
            {discardPileTop ? (
              <CardComponent
                card={discardPileTop}
                size="lg"
                onClick={isMyTurn && !drawnCard && (phase === 'playing' || phase === 'last_turns') ? handleDrawDiscard : undefined}
                disabled={!isMyTurn || !!drawnCard || (phase !== 'playing' && phase !== 'last_turns')}
              />
            ) : (
              <div className="card card-lg card-empty" />
            )}
          </div>

          {drawnCard && (
            <div className="pile-container">
              <div className="pile-label">In Hand</div>
              <CardComponent card={drawnCard} size="lg" />
            </div>
          )}
        </div>
      </div>

      {/* My area */}
      <div className="my-area">
        {phase === 'peek' && (
          <div className="peek-instruction">
            Click 2 cards to peek ({myPeekedCount}/2)
            {myPeekedCount >= 2 && (
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 12 }} onClick={() => socket.emit('peek_done')}>
                Done Peeking
              </button>
            )}
          </div>
        )}
        {canSnap && !pendingOpponentSnap && (
          <div className="snap-hint">Double-click any card to snap it against the discard</div>
        )}
        {pendingOpponentSnap && (
          <div className="snap-hint snap-hint-active">↓ Click one of your cards to give away</div>
        )}

        <PlayerArea
          player={me}
          isMe={true}
          size="lg"
          selectedCardIndex={drawnCard ? selectedCardIndex : null}
          highlightCards={!!pendingOpponentSnap}
          onCardClick={handleMyCardClick}
          onCardDoubleClick={canSnap && !pendingOpponentSnap ? handleMyCardDoubleClick : undefined}
          tempRevealedCards={tempRevealedCards}
        />

        <div className="action-panel-area">
          <ActionPanel gameState={gameState} selectedCardIndex={selectedCardIndex} onSelectCard={setSelectedCardIndex} />
        </div>
      </div>

      {phase === 'ability' && abilityState && <AbilityModal gameState={gameState} />}
      {phase === 'game_over' && <GameOver gameState={gameState} myPlayerId={myPlayerId} />}

      {/* Chat sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-title">Chat</div>
        <div className="chat-sidebar-messages">
          {chatMessages.map((msg, i) => (
            <div key={i} className="chat-message" style={{ fontSize: '0.8rem', marginBottom: 4 }}>
              <span className="chat-name" style={{ fontSize: '0.75rem' }}>{msg.playerName}: </span>
              {msg.message}
            </div>
          ))}
        </div>
        <form className="chat-sidebar-input" onSubmit={handleChat}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Chat..." maxLength={200} />
          <button type="submit" className="btn btn-secondary btn-sm">Go</button>
        </form>
      </div>
    </div>
  );
}
