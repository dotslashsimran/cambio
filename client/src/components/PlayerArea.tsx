import React from 'react';
import { ClientPlayer, ClientCard } from '../types';
import CardComponent from './CardComponent';

interface PlayerAreaProps {
  player: ClientPlayer;
  isMe: boolean;
  size?: 'sm' | 'md' | 'lg';
  selectedCardIndex?: number | null;
  onCardClick?: (index: number) => void;
  onCardDoubleClick?: (index: number) => void;
  targetedCardIndex?: number | null;
  highlightCards?: boolean;
  tempRevealedCards?: Record<number, ClientCard>;
}

export default function PlayerArea({
  player,
  isMe,
  size = 'md',
  selectedCardIndex = null,
  onCardClick,
  onCardDoubleClick,
  targetedCardIndex = null,
  highlightCards = false,
  tempRevealedCards = {},
}: PlayerAreaProps) {
  return (
    <div className="player-area">
      <div className={`player-name-tag ${player.isCurrentTurn ? 'current-turn' : ''}`}>
        {isMe ? 'You' : player.name}
        {player.isCurrentTurn ? ' ▶' : ''}
      </div>
      <div className="player-cards">
        {player.cards.map((card, idx) => {
          const displayCard = card ?? (isMe ? tempRevealedCards[idx] ?? null : null);
          return (
            <CardComponent
              key={idx}
              card={displayCard}
              faceDown={!displayCard}
              selected={selectedCardIndex === idx}
              targeted={targetedCardIndex === idx}
              onClick={onCardClick ? () => onCardClick(idx) : undefined}
              onDoubleClick={onCardDoubleClick ? () => onCardDoubleClick(idx) : undefined}
              size={size}
              disabled={!onCardClick && !onCardDoubleClick}
              glowGreen={highlightCards}
            />
          );
        })}
        {/* If card count > cards array length (can happen with penalty cards), show extras */}
        {player.cardCount > player.cards.length && Array.from({ length: player.cardCount - player.cards.length }).map((_, i) => (
          <CardComponent
            key={`extra-${i}`}
            faceDown={true}
            size={size}
            disabled={true}
          />
        ))}
      </div>
    </div>
  );
}
