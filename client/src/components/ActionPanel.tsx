import React, { useState } from 'react';
import { ClientGameState, ClientCard } from '../types';
import { getSocket } from '../socket';
import CardComponent from './CardComponent';

interface ActionPanelProps {
  gameState: ClientGameState;
  selectedCardIndex: number | null;
  onSelectCard: (index: number | null) => void;
}

export default function ActionPanel({ gameState, selectedCardIndex, onSelectCard }: ActionPanelProps) {
  const socket = getSocket();
  const {
    phase,
    myPlayerId,
    players,
    drawnCard,
    canCallCambio,
    cambioCalledBy,
    lastTurnsLeft,
  } = gameState;

  const me = players.find(p => p.id === myPlayerId);
  const isMyTurn = me?.isCurrentTurn ?? false;

  const handleDrawDeck = () => {
    socket.emit('draw_card', { source: 'deck' });
  };

  const handleDrawDiscard = () => {
    socket.emit('draw_card', { source: 'discard' });
  };

  const handleCallCambio = () => {
    socket.emit('call_cambio');
  };

  const handleDiscardDrawn = () => {
    socket.emit('discard_drawn');
    onSelectCard(null);
  };

  const handleReplaceCard = () => {
    if (selectedCardIndex !== null) {
      socket.emit('replace_card', { cardIndex: selectedCardIndex });
      onSelectCard(null);
    }
  };

  if (phase === 'peek') {
    const myPlayer = players.find(p => p.id === myPlayerId);
    const peeksDone = myPlayer?.cards.filter(c => c !== null).length ?? 0;
    const allPeeked = peeksDone >= 2;

    return (
      <div className="action-panel">
        <div className="action-panel-title">Initial Peek Phase</div>
        <div className="peek-instruction">
          Click on 2 of your face-down cards to peek at them. ({peeksDone}/2 peeked)
        </div>
        {allPeeked && (
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => socket.emit('peek_done')}>
              Done Peeking
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!isMyTurn) {
    const currentPlayer = players[gameState.currentPlayerIndex];
    return (
      <div className="action-panel">
        <div className="turn-info">
          {cambioCalledBy && (
            <div className="cambio-indicator">
              CAMBIO CALLED! {lastTurnsLeft} turn(s) remaining
            </div>
          )}
          Waiting for {currentPlayer?.name ?? '...'} to play...
        </div>
      </div>
    );
  }

  if (phase === 'playing' || phase === 'last_turns') {
    if (!drawnCard) {
      return (
        <div className="action-panel">
          <div className="action-panel-title">Your Turn</div>
          {cambioCalledBy && (
            <div className="cambio-indicator">
              CAMBIO called! {lastTurnsLeft} turns left (including yours)
            </div>
          )}
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={handleDrawDeck}>
              Draw from Deck
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDrawDiscard}
              disabled={!gameState.discardPileTop}
            >
              Draw from Discard
            </button>
            {canCallCambio && (
              <button className="cambio-button" onClick={handleCallCambio}>
                Call Cambio!
              </button>
            )}
          </div>
        </div>
      );
    }

    // Has drawn card
    return (
      <div className="action-panel">
        <div className="action-panel-title">You Drew:</div>
        <div className="drawn-card-display">
          <CardComponent card={drawnCard} size="md" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="drawn-card-label">Choose an action:</div>
            <button
              className="btn btn-primary"
              onClick={handleReplaceCard}
              disabled={selectedCardIndex === null}
            >
              Replace Selected Card {selectedCardIndex !== null ? `(Slot ${selectedCardIndex + 1})` : '← Click a card first'}
            </button>
            <button className="btn btn-secondary" onClick={handleDiscardDrawn}>
              Discard Drawn Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'snap_window') {
    return (
      <div className="action-panel">
        <div className="turn-info">Snap window open! Act fast!</div>
      </div>
    );
  }

  if (phase === 'ability') {
    return (
      <div className="action-panel">
        <div className="turn-info">Ability in progress...</div>
      </div>
    );
  }

  return null;
}
