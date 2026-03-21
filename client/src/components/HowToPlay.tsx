import React, { useEffect } from 'react';

interface HowToPlayProps {
  onClose: () => void;
}

const ABILITY_CARDS = [
  {
    ranks: '7 / 8',
    icon: '👁',
    color: '#7ec8e3',
    label: 'Peek Own',
    desc: 'Secretly look at one of your own face-down cards.',
  },
  {
    ranks: '9 / 10',
    icon: '🔍',
    color: '#f9c74f',
    label: 'Peek Opponent',
    desc: "Secretly look at one of any opponent's cards.",
  },
  {
    ranks: 'J',
    icon: '🔄',
    color: '#f4845f',
    label: 'Peek & Maybe Swap',
    desc: 'Peek one of your cards, then choose to swap it with any opponent\'s card — or skip.',
  },
  {
    ranks: 'Q',
    icon: '⚡',
    color: '#c4aaec',
    label: 'Peek Opp & Swap',
    desc: "Peek any opponent's card, then swap any two cards on the table (yours or others').",
  },
  {
    ranks: 'K',
    icon: '👑',
    color: '#90be6d',
    label: 'Peek Both & Swap',
    desc: 'Peek one of your own AND one opponent\'s card, then swap any two cards freely.',
  },
];

const CARD_VALUES = [
  { label: 'Red King', value: '-1', note: 'Best card in the game', color: '#ef233c' },
  { label: 'Joker', value: '0', note: '2 jokers in the deck', color: '#c4aaec' },
  { label: 'Ace', value: '1', note: '', color: 'rgba(255,255,255,0.15)' },
  { label: '2 – 10', value: 'face', note: 'Worth their number', color: 'rgba(255,255,255,0.15)' },
  { label: 'J', value: '11', note: 'Ability card', color: '#f4845f' },
  { label: 'Q', value: '12', note: 'Ability card', color: '#c4aaec' },
  { label: 'Black King', value: '13', note: 'Worst card in the game', color: '#6c757d' },
];

export default function HowToPlay({ onClose }: HowToPlayProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="htp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="htp-panel">
        {/* Header */}
        <div className="htp-header">
          <div className="htp-header-inner">
            <div className="htp-logo-suits">♠ ♥ ♦ ♣</div>
            <h1 className="htp-title">How to Play <span className="htp-cambio">Cambio</span></h1>
            <p className="htp-tagline">A fast card game of memory, bluffing, and ruthless snapping.</p>
          </div>
          <button className="htp-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="htp-body">
          {/* Objective */}
          <section className="htp-section">
            <div className="htp-section-label">
              <span className="htp-icon">🎯</span> Objective
            </div>
            <p className="htp-text">
              End the game with the <strong>lowest total card value</strong> in your hand.
              You start with <strong>4 face-down cards</strong> — you can peek at 2 of them before the round begins. Remember what you have, swap in better cards, and call <em>Cambio</em> when you think you're ahead.
            </p>
          </section>

          {/* Divider */}
          <div className="htp-divider" />

          {/* Turn flow */}
          <section className="htp-section">
            <div className="htp-section-label">
              <span className="htp-icon">🔁</span> On Your Turn
            </div>
            <div className="htp-steps">
              <div className="htp-step">
                <div className="htp-step-num">1</div>
                <div className="htp-step-body">
                  <strong>Draw a card</strong> from the <em>deck</em> or <em>discard pile</em>.
                </div>
              </div>
              <div className="htp-step">
                <div className="htp-step-num">2</div>
                <div className="htp-step-body">
                  <strong>Replace</strong> one of your face-down cards with the drawn card (your old card goes to discard) — or <strong>discard</strong> the drawn card directly. If you discard an ability card, its power activates!
                </div>
              </div>
              <div className="htp-step">
                <div className="htp-step-num alt">or</div>
                <div className="htp-step-body">
                  Instead of drawing, <strong>call Cambio</strong> if you think your hand is the lowest. All other players get one final turn, then scores are revealed.
                </div>
              </div>
            </div>
          </section>

          <div className="htp-divider" />

          {/* Ability cards */}
          <section className="htp-section">
            <div className="htp-section-label">
              <span className="htp-icon">✨</span> Ability Cards
            </div>
            <p className="htp-text" style={{ marginBottom: 16 }}>
              Discarding certain ranks triggers a special power. Higher-value ability cards are riskier to keep but devastating when used.
            </p>
            <div className="htp-abilities">
              {ABILITY_CARDS.map(a => (
                <div className="htp-ability-card" key={a.ranks} style={{ borderColor: a.color + '55', background: a.color + '12' }}>
                  <div className="htp-ability-rank" style={{ color: a.color }}>{a.ranks}</div>
                  <div className="htp-ability-icon">{a.icon}</div>
                  <div className="htp-ability-label" style={{ color: a.color }}>{a.label}</div>
                  <div className="htp-ability-desc">{a.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="htp-divider" />

          {/* Snapping */}
          <section className="htp-section">
            <div className="htp-section-label">
              <span className="htp-icon">⚡</span> Snapping
            </div>
            <p className="htp-text" style={{ marginBottom: 12 }}>
              At <em>any time</em> during the game, if a card in anyone's hand matches the top discard card, you can <strong>snap</strong> it — even if it's not your turn. Speed matters.
            </p>
            <div className="htp-snap-rules">
              <div className="htp-snap-rule">
                <div className="htp-snap-icon own">👆</div>
                <div>
                  <strong>Snap your own card</strong><br/>
                  Double-click your card. If it matches the discard — gone! If it doesn't — you get a penalty card.
                </div>
              </div>
              <div className="htp-snap-rule">
                <div className="htp-snap-icon opp">✌️</div>
                <div>
                  <strong>Snap an opponent's card</strong><br/>
                  Double-click their card. It flies to the discard instantly. Then pick one of your cards to give them in exchange. Wrong snap = penalty card for you.
                </div>
              </div>
            </div>
          </section>

          <div className="htp-divider" />

          {/* Calling Cambio */}
          <section className="htp-section">
            <div className="htp-section-label">
              <span className="htp-icon">🔔</span> Calling Cambio
            </div>
            <p className="htp-text">
              Instead of drawing on your turn, click <strong>Call Cambio</strong> when you believe your hand total is the lowest. Every other player gets <em>exactly one more turn</em>, then all cards are flipped and scored. If you called Cambio but don't actually have the lowest score, you get a penalty.
            </p>
          </section>

          <div className="htp-divider" />

          {/* Card values */}
          <section className="htp-section">
            <div className="htp-section-label">
              <span className="htp-icon">🃏</span> Card Values
            </div>
            <div className="htp-values">
              {CARD_VALUES.map(v => (
                <div className="htp-value-row" key={v.label}>
                  <div className="htp-value-label" style={{ color: v.color === 'rgba(255,255,255,0.15)' ? undefined : v.color }}>{v.label}</div>
                  <div className="htp-value-dots" />
                  <div className="htp-value-num" style={{ color: v.color === 'rgba(255,255,255,0.15)' ? undefined : v.color }}>{v.value}</div>
                  {v.note && <div className="htp-value-note">{v.note}</div>}
                </div>
              ))}
            </div>
          </section>

          {/* Footer tip */}
          <div className="htp-tip">
            <span className="htp-tip-icon">💡</span>
            <span><strong>Pro tip:</strong> Track swaps carefully — your hand changes constantly through snaps and ability swaps, so what you peeked at the start may no longer be there.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
