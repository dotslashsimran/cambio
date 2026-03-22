import React from 'react';
import { ClientCard } from '../types';

interface CardComponentProps {
  card?: ClientCard | null;
  faceDown?: boolean;
  selected?: boolean;
  targeted?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  glowGreen?: boolean;
  abilityHighlight?: boolean;
}

const SUIT_MAP: Record<string, string> = {
  'clubs': 'C', 'diamonds': 'D', 'hearts': 'H', 'spades': 'S',
};

function getCardUrl(card: ClientCard): string {
  if (card.suit === 'joker') return `/cards/joker.webp`;
  return `/cards/${card.rank}${SUIT_MAP[card.suit]}.png`;
}

export default function CardComponent({
  card,
  faceDown = false,
  selected = false,
  targeted = false,
  onClick,
  onDoubleClick,
  size = 'md',
  disabled = false,
  glowGreen = false,
  abilityHighlight = false,
}: CardComponentProps) {
  const showFaceDown = faceDown || !card;

  const classes = [
    'card',
    `card-${size}`,
    showFaceDown ? 'card-face-down' : 'card-face-up',
    selected ? 'card-selected' : '',
    targeted ? 'card-targeted' : '',
    disabled ? 'card-disabled' : '',
    glowGreen ? 'card-glow-green' : '',
    abilityHighlight ? 'card-ability-select' : '',
    !card && !faceDown ? 'card-empty' : '',
  ].filter(Boolean).join(' ');

  if (showFaceDown) {
    return (
      <div
        className={classes}
        onClick={disabled ? undefined : onClick}
        onDoubleClick={disabled ? undefined : onDoubleClick}
      />
    );
  }

  if (!card) {
    return (
      <div
        className={classes}
        onClick={disabled ? undefined : onClick}
        onDoubleClick={disabled ? undefined : onDoubleClick}
      />
    );
  }

  return (
    <div
      className={classes}
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      style={{ padding: 0, overflow: 'hidden', background: 'white' }}
    >
      <img
        src={getCardUrl(card)}
        alt={`${card.rank} of ${card.suit}`}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
}
