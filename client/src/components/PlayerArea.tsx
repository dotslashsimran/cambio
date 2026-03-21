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
  peekHighlightIndex?: number | null;
  swappingCardIndices?: number[];
  snapHighlightIndex?: number | null;
  snapHighlightSuccess?: boolean;
  replacedCardIndex?: number | null;
  isFrozen?: boolean;
  abilityBadge?: string;
  abilityHighlight?: boolean;
  abilitySelectedIndices?: number[];
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
  peekHighlightIndex = null,
  swappingCardIndices = [],
  snapHighlightIndex = null,
  snapHighlightSuccess = true,
  replacedCardIndex = null,
  isFrozen = false,
  abilityBadge,
  abilityHighlight = false,
  abilitySelectedIndices = [],
}: PlayerAreaProps) {
  return (
    <div className={`player-area${isFrozen ? ' player-frozen' : ''}`}>
      <div className={`player-name-tag ${player.isCurrentTurn ? 'current-turn' : ''}${isFrozen ? ' frozen-tag' : ''}`}>
        {isMe ? 'You' : player.name}
        {player.isCurrentTurn ? ' ▶' : ''}
        {isFrozen ? ' 🔒' : ''}
      </div>
      {abilityBadge && (
        <div className="ability-badge">{abilityBadge}</div>
      )}
      <div className="player-cards">
        {player.cards.map((card, idx) => {
          const displayCard = card ?? (isMe ? tempRevealedCards[idx] ?? null : null);
          const isSwapping = swappingCardIndices.includes(idx);
          const isPeeked = peekHighlightIndex === idx;
          const isSnapped = snapHighlightIndex === idx;
          const isReplaced = replacedCardIndex === idx;
          const isAbilitySelected = abilitySelectedIndices.includes(idx);
          const snapClass = isSnapped ? (snapHighlightSuccess ? ' card-snap-success' : ' card-snap-fail') : '';
          return (
            <div key={idx} className={`card-wrapper${isSwapping ? ' card-swapping' : ''}${isPeeked ? ' card-peeked' : ''}${snapClass}${isReplaced ? ' card-replaced' : ''}`}>
              <CardComponent
                card={displayCard}
                faceDown={!displayCard}
                selected={selectedCardIndex === idx || isAbilitySelected}
                targeted={targetedCardIndex === idx}
                onClick={onCardClick ? () => onCardClick(idx) : undefined}
                onDoubleClick={onCardDoubleClick ? () => onCardDoubleClick(idx) : undefined}
                size={size}
                disabled={!onCardClick && !onCardDoubleClick}
                glowGreen={highlightCards}
                abilityHighlight={abilityHighlight && !isAbilitySelected}
              />
            </div>
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
