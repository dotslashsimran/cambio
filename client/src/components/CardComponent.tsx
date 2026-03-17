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

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '🃏',
};

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
    card && !showFaceDown ? `card-${card.suit}` : '',
  ].filter(Boolean).join(' ');

  if (showFaceDown) {
    return (
      <div className={classes} onClick={disabled ? undefined : onClick} onDoubleClick={disabled ? undefined : onDoubleClick} />
    );
  }

  if (!card) {
    return <div className={classes} onClick={disabled ? undefined : onClick} onDoubleClick={disabled ? undefined : onDoubleClick} />;
  }

  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div className={classes} onClick={disabled ? undefined : onClick} onDoubleClick={disabled ? undefined : onDoubleClick}>
      <div className="card-inner">
        <div className="card-corner card-corner-tl">
          <span className="card-rank">{card.rank}</span>
          <span className="card-suit-sm">{symbol}</span>
        </div>
        <div className="card-center-suit">{symbol}</div>
        <div className="card-corner card-corner-br">
          <span className="card-rank">{card.rank}</span>
          <span className="card-suit-sm">{symbol}</span>
        </div>
        {/* Value hint on large cards */}
        {size === 'lg' && (
          <div style={{
            position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)',
            fontSize: '0.6rem', color: 'rgba(0,0,0,0.3)', fontWeight: 700
          }}>
            {card.value}
          </div>
        )}
      </div>
    </div>
  );
}
