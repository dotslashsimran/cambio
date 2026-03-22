import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface HowToPlayProps {
  onClose: () => void;
}

type AbilityKey = '7-8' | '9-10' | 'J' | 'Q' | 'K';

function DemoCard({
  rank,
  suit,
  faceDown = false,
  glow = false,
  label,
}: {
  rank?: string;
  suit?: string;
  faceDown?: boolean;
  glow?: boolean;
  label?: string;
}) {
  return (
    <div className="demo-card-wrap">
      {faceDown ? (
        <div className={`demo-card demo-card-back ${glow ? 'demo-card-glow' : ''}`}>
          <span className="demo-card-back-heart">♥</span>
        </div>
      ) : (
        <div className={`demo-card demo-card-face ${glow ? 'demo-card-glow' : ''}`}>
          <img src={`/cards/${rank}${suit}.png`} alt={`${rank}${suit}`} draggable={false} />
        </div>
      )}
      {label && <div className="demo-card-label">{label}</div>}
    </div>
  );
}

function AbilityDemo({ abilityKey }: { abilityKey: AbilityKey }) {
  switch (abilityKey) {
    case '7-8':
      return (
        <div className="htp-demo">
          <div className="demo-scene">
            <div className="demo-player-label">Your hand</div>
            <div className="demo-hand">
              <DemoCard faceDown />
              <DemoCard faceDown />
              <DemoCard rank="7" suit="H" glow label="👁 only you see this" />
              <DemoCard faceDown />
            </div>
          </div>
          <p className="demo-note">
            Pick any one of your own face-down cards to secretly peek at. No one else sees it.
          </p>
        </div>
      );

    case '9-10':
      return (
        <div className="htp-demo">
          <div className="demo-scene">
            <div className="demo-player-label">Opponent's hand</div>
            <div className="demo-hand">
              <DemoCard faceDown />
              <DemoCard rank="9" suit="S" glow label="🔍 you peek" />
              <DemoCard faceDown />
              <DemoCard faceDown />
            </div>
          </div>
          <p className="demo-note">
            Pick any opponent's card to secretly peek at. They don't know which card you saw.
          </p>
        </div>
      );

    case 'J':
      return (
        <div className="htp-demo">
          <div className="demo-scene">
            <div className="demo-two-col">
              <div>
                <div className="demo-player-label">Your hand</div>
                <div className="demo-hand">
                  <DemoCard faceDown />
                  <DemoCard rank="2" suit="C" glow label="👁 peek yours" />
                  <DemoCard faceDown />
                  <DemoCard faceDown />
                </div>
              </div>
              <div>
                <div className="demo-player-label">Opponent's hand</div>
                <div className="demo-hand">
                  <DemoCard faceDown />
                  <DemoCard faceDown label="swap target?" />
                  <DemoCard faceDown />
                  <DemoCard faceDown />
                </div>
              </div>
            </div>
            <div className="demo-then">↓ then decide…</div>
            <div className="demo-choice-row">
              <div className="demo-choice">
                <DemoCard rank="2" suit="C" />
                <div className="demo-swap-arrow">⇄</div>
                <DemoCard faceDown />
                <div className="demo-choice-label">swap it</div>
              </div>
              <div className="demo-or">or</div>
              <div className="demo-choice">
                <div className="demo-skip">skip</div>
              </div>
            </div>
          </div>
          <p className="demo-note">
            Peek one of your cards, then choose whether to swap it with any opponent's card — or just skip the swap.
          </p>
        </div>
      );

    case 'Q':
      return (
        <div className="htp-demo">
          <div className="demo-scene">
            <div className="demo-two-col">
              <div>
                <div className="demo-player-label">Your hand</div>
                <div className="demo-hand">
                  <DemoCard faceDown />
                  <DemoCard rank="A" suit="H" label="your card" />
                  <DemoCard faceDown />
                  <DemoCard faceDown />
                </div>
              </div>
              <div>
                <div className="demo-player-label">Opponent's hand</div>
                <div className="demo-hand">
                  <DemoCard faceDown />
                  <DemoCard rank="K" suit="S" glow label="👁 peek first" />
                  <DemoCard faceDown />
                  <DemoCard faceDown />
                </div>
              </div>
            </div>
            <div className="demo-then">↓ then swap any two cards…</div>
            <div className="demo-choice-row">
              <div className="demo-choice">
                <DemoCard rank="A" suit="H" label="yours" />
                <div className="demo-swap-arrow">⇄</div>
                <DemoCard rank="K" suit="S" label="their 13!" />
              </div>
            </div>
          </div>
          <p className="demo-note">
            Peek any opponent's card first, then swap any two cards anywhere on the table — yours, theirs, or any mix.
          </p>
        </div>
      );

    case 'K':
      return (
        <div className="htp-demo">
          <div className="demo-scene">
            <div className="demo-two-col">
              <div>
                <div className="demo-player-label">Your hand</div>
                <div className="demo-hand">
                  <DemoCard faceDown />
                  <DemoCard rank="K" suit="H" glow label="👁 -1! keep it" />
                  <DemoCard faceDown />
                  <DemoCard faceDown />
                </div>
              </div>
              <div>
                <div className="demo-player-label">Opponent's hand</div>
                <div className="demo-hand">
                  <DemoCard rank="K" suit="S" glow label="👁 13! get rid" />
                  <DemoCard faceDown />
                  <DemoCard faceDown />
                  <DemoCard faceDown />
                </div>
              </div>
            </div>
            <div className="demo-then">↓ then swap any two cards freely…</div>
            <div className="demo-choice-row">
              <div className="demo-choice">
                <DemoCard rank="K" suit="S" label="their 13" />
                <div className="demo-swap-arrow">⇄</div>
                <DemoCard faceDown label="dump yours" />
              </div>
            </div>
          </div>
          <p className="demo-note">
            The most powerful ability. Peek one of yours and one of theirs, then swap any two cards freely on the table.
          </p>
        </div>
      );

    default:
      return null;
  }
}

const ABILITY_CARDS: { key: AbilityKey; ranks: string; icon: string; color: string; label: string; desc: string }[] = [
  {
    key: '7-8',
    ranks: '7 / 8',
    icon: '👁',
    color: '#7ec8e3',
    label: 'Peek Own',
    desc: 'Secretly look at one of your own face-down cards.',
  },
  {
    key: '9-10',
    ranks: '9 / 10',
    icon: '🔍',
    color: '#f9c74f',
    label: 'Peek Opponent',
    desc: "Secretly look at one of any opponent's cards.",
  },
  {
    key: 'J',
    ranks: 'J',
    icon: '🔄',
    color: '#f4845f',
    label: 'Peek & Maybe Swap',
    desc: "Peek one of your cards, then choose to swap it with any opponent's card — or skip.",
  },
  {
    key: 'Q',
    ranks: 'Q',
    icon: '⚡',
    color: '#c4aaec',
    label: 'Peek Opp & Swap',
    desc: "Peek any opponent's card, then swap any two cards on the table.",
  },
  {
    key: 'K',
    ranks: 'K',
    icon: '👑',
    color: '#90be6d',
    label: 'Peek Both & Swap',
    desc: "Peek one of your own AND one opponent's card, then swap any two cards freely.",
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
  const [selectedAbility, setSelectedAbility] = useState<AbilityKey | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
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
              Discarding certain ranks triggers a special power. Click any card below to see how it works.
            </p>
            <div className="htp-ability-list">
              {ABILITY_CARDS.map(a => {
                const isOpen = selectedAbility === a.key;
                return (
                  <div key={a.key} className={`htp-ability-row ${isOpen ? 'htp-ability-row-open' : ''}`} style={{ borderColor: isOpen ? a.color + '88' : 'rgba(255,255,255,0.07)' }}>
                    <button
                      className="htp-ability-row-btn"
                      onClick={() => setSelectedAbility(isOpen ? null : a.key)}
                      style={{ color: isOpen ? a.color : undefined }}
                    >
                      <div className="htp-ability-row-rank" style={{ color: a.color, borderColor: a.color + '44', background: a.color + '15' }}>{a.ranks}</div>
                      <div className="htp-ability-row-icon">{a.icon}</div>
                      <div className="htp-ability-row-text">
                        <div className="htp-ability-row-label" style={{ color: isOpen ? a.color : 'rgba(255,255,255,0.9)' }}>{a.label}</div>
                        <div className="htp-ability-row-desc">{a.desc}</div>
                      </div>
                      <div className="htp-ability-row-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="htp-ability-demo-wrap">
                        <AbilityDemo abilityKey={a.key} />
                      </div>
                    )}
                  </div>
                );
              })}
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
    </div>,
    document.body
  );
}
