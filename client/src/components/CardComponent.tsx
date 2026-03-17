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
}

const BASE = 'https://webisso.github.io/playing-cards/';

const RANK_MAP: Record<string, string> = {
  'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king',
};

function getCardUrl(card: ClientCard): string {
  if (card.suit === 'joker') return `${BASE}png/joker_red.png`;
  const rank = RANK_MAP[card.rank] ?? card.rank.toLowerCase();
  return `${BASE}png/${rank}_of_${card.suit}.png`;
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
