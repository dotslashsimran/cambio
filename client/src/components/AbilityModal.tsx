import React, { useState } from 'react';
import { ClientGameState, ClientAbilityState, ClientPlayer, ClientCard } from '../types';
import { getSocket } from '../socket';
import CardComponent from './CardComponent';

interface AbilityModalProps {
  gameState: ClientGameState;
}

const ABILITY_NAMES: Record<string, string> = {
  '7': 'Peek Own (7)',
  '8': 'Peek Own (8)',
  '9': 'Peek Opponent (9)',
  '10': 'Peek Opponent (10)',
  'J': 'Jack: Peek & Swap',
  'Q': 'Queen: Peek Opp & Swap Any',
  'K': 'King: Peek Both & Swap',
};

export default function AbilityModal({ gameState }: AbilityModalProps) {
  const socket = getSocket();
  const [selectedOwnCard, setSelectedOwnCard] = useState<number | null>(null);
  const [selectedOppPlayer, setSelectedOppPlayer] = useState<string>('');
  const [selectedOppCard, setSelectedOppCard] = useState<number | null>(null);
  const [selectedP1Player, setSelectedP1Player] = useState<string>('');
  const [selectedP1Card, setSelectedP1Card] = useState<number | null>(null);
  const [selectedP2Player, setSelectedP2Player] = useState<string>('');
  const [selectedP2Card, setSelectedP2Card] = useState<number | null>(null);

  const { abilityState, players, myPlayerId, cambioCalledBy } = gameState;
  if (!abilityState) return null;

  const isMyAbility = abilityState.isMyAbility;
  const step = abilityState.step;
  const rank = abilityState.abilityCard.rank;

  const me = players.find(p => p.id === myPlayerId)!;
  const opponents = players.filter(p => p.id !== myPlayerId);
  const isFrozen = (pid: string) => pid === cambioCalledBy;

  if (!isMyAbility) {
    const abilityOwner = players.find(p => p.isCurrentTurn);
    const ownerName = abilityOwner?.name ?? 'Another player';

    let actionDesc = 'using their ability...';
    if (step === 'peek_own_select') actionDesc = 'choosing one of their own cards to peek at...';
    else if (step === 'peek_own_reveal') {
      const idx = abilityState.peekedOwnIndex;
      actionDesc = idx !== undefined ? `peeking at their card in slot ${idx + 1}` : 'peeking at their own card...';
    }
    else if (step === 'peek_opp_select') actionDesc = 'choosing an opponent\'s card to peek at...';
    else if (step === 'peek_opp_reveal') {
      const oppName = players.find(p => p.id === abilityState.peekedOppPlayerId)?.name ?? 'someone';
      const idx = abilityState.peekedOppIndex;
      actionDesc = idx !== undefined ? `peeking at ${oppName}'s card in slot ${idx + 1}` : `peeking at ${oppName}'s card...`;
    }
    else if (step === 'jack_swap_decide') actionDesc = 'deciding whether to swap...';
    else if (step === 'jack_swap_select_opp') actionDesc = 'choosing cards to swap...';
    else if (step === 'queen_swap_select') actionDesc = 'choosing two cards to swap...';
    else if (step === 'king_swap_select') actionDesc = 'choosing two cards to swap...';

    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank] || `Ability: ${rank}`}</div>
          <div className="waiting-text"><strong>{ownerName}</strong> is {actionDesc}</div>
        </div>
      </div>
    );
  }

  const emitAbility = (action: string, data: any = {}) => {
    socket.emit('ability_action', { action, data });
    setSelectedOwnCard(null);
    setSelectedOppPlayer('');
    setSelectedOppCard(null);
    setSelectedP1Player('');
    setSelectedP1Card(null);
    setSelectedP2Player('');
    setSelectedP2Card(null);
  };

  const oppTarget = players.find(p => p.id === selectedOppPlayer);
  const p1Target = players.find(p => p.id === selectedP1Player);
  const p2Target = players.find(p => p.id === selectedP2Player);

  // 7/8: peek own reveal (waiting for dismiss)
  if ((rank === '7' || rank === '8') && step === 'peek_own_reveal') {
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          <div className="ability-step-desc">Your card at slot {(abilityState.peekedOwnIndex ?? 0) + 1}:</div>
          {abilityState.peekedOwnCard && (
            <div className="peeked-card-reveal">
              <CardComponent card={abilityState.peekedOwnCard} size="lg" />
            </div>
          )}
          <div className="ability-actions">
            <button className="btn btn-primary" onClick={() => emitAbility('close_peek')}>Got it!</button>
          </div>
        </div>
      </div>
    );
  }

  // 7/8: peek own select
  if ((rank === '7' || rank === '8') && step === 'peek_own_select') {
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          <div className="ability-step-desc">Select one of your cards to peek at:</div>
          <div className="ability-cards-row">
            {me.cards.map((card, idx) => (
              <CardComponent
                key={idx}
                card={card}
                faceDown={!card}
                selected={selectedOwnCard === idx}
                onClick={() => setSelectedOwnCard(idx)}
                size="md"
              />
            ))}
          </div>
          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('peek_own', { cardIndex: selectedOwnCard })}
              disabled={selectedOwnCard === null}
            >
              Peek Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 9/10: peek opp reveal (waiting for dismiss)
  if ((rank === '9' || rank === '10') && step === 'peek_opp_reveal') {
    const oppName = players.find(p => p.id === abilityState.peekedOppPlayerId)?.name ?? 'Opponent';
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          <div className="ability-step-desc">{oppName}'s card at slot {(abilityState.peekedOppIndex ?? 0) + 1}:</div>
          {abilityState.peekedOppCard && (
            <div className="peeked-card-reveal">
              <CardComponent card={abilityState.peekedOppCard} size="lg" />
            </div>
          )}
          <div className="ability-actions">
            <button className="btn btn-primary" onClick={() => emitAbility('close_peek')}>Got it!</button>
          </div>
        </div>
      </div>
    );
  }

  // 9/10: peek opponent select
  if ((rank === '9' || rank === '10') && step === 'peek_opp_select') {
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          <div className="ability-step-desc">Select an opponent's card to peek at:</div>
          <div className="ability-player-select">
            <select value={selectedOppPlayer} onChange={e => { setSelectedOppPlayer(e.target.value); setSelectedOppCard(null); }}>
              <option value="">-- Select opponent --</option>
              {opponents.map(p => <option key={p.id} value={p.id} disabled={isFrozen(p.id)}>{isFrozen(p.id) ? `${p.name} 🔒 Frozen` : p.name}</option>)}
            </select>
          </div>
          {oppTarget && (
            <div className="ability-cards-row">
              {Array.from({ length: oppTarget.cardCount }).map((_, idx) => (
                <CardComponent
                  key={idx}
                  card={oppTarget.cards[idx] ?? null}
                  faceDown={!oppTarget.cards[idx]}
                  selected={selectedOppCard === idx}
                  onClick={() => setSelectedOppCard(idx)}
                  size="md"
                />
              ))}
            </div>
          )}
          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('peek_opp', { targetPlayerId: selectedOppPlayer, cardIndex: selectedOppCard })}
              disabled={!selectedOppPlayer || selectedOppCard === null}
            >
              Peek Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Jack: peek own select
  if (rank === 'J' && step === 'peek_own_select') {
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          <div className="ability-step-desc">Select one of your cards to peek at (you may then swap it):</div>
          <div className="ability-cards-row">
            {me.cards.map((card, idx) => (
              <CardComponent
                key={idx}
                card={card}
                faceDown={!card}
                selected={selectedOwnCard === idx}
                onClick={() => setSelectedOwnCard(idx)}
                size="md"
              />
            ))}
          </div>
          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('peek_own', { cardIndex: selectedOwnCard })}
              disabled={selectedOwnCard === null}
            >
              Peek Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Jack: decide to swap
  if (rank === 'J' && step === 'jack_swap_decide') {
    const peekedIdx = abilityState.peekedOwnIndex;
    const peekedCard = abilityState.peekedOwnCard;
    const hasValidOpp = opponents.some(p => !isFrozen(p.id));
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          {peekedCard && (
            <div className="peeked-card-reveal">
              <div className="label">Your card at slot {(peekedIdx ?? 0) + 1}:</div>
              <CardComponent card={peekedCard} size="lg" />
            </div>
          )}
          {hasValidOpp
            ? <div className="ability-step-desc">Do you want to swap this card with an opponent's card?</div>
            : <div className="ability-step-desc" style={{ color: '#93c5fd' }}>All opponents' cards are frozen — swap skipped.</div>
          }
          <div className="ability-actions">
            {hasValidOpp && (
              <button className="btn btn-primary" onClick={() => emitAbility('swap')}>Swap It</button>
            )}
            <button className="btn btn-secondary" onClick={() => emitAbility('skip')}>
              {hasValidOpp ? 'Skip' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Jack: select any own card + opponent card to swap
  if (rank === 'J' && step === 'jack_swap_select_opp') {
    const peekedIdx = abilityState.peekedOwnIndex;
    const peekedCard = abilityState.peekedOwnCard;
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          {peekedCard && (
            <div className="peeked-card-reveal">
              <div className="label">Your card at slot {(peekedIdx ?? 0) + 1}:</div>
              <CardComponent card={peekedCard} size="lg" />
            </div>
          )}
          <div className="ability-step-desc">Choose any of your cards and an opponent's card to swap:</div>

          <div className="ability-select-grid">
            <div className="ability-select-label">Your card:</div>
            <div className="ability-cards-row">
              {me.cards.map((card, idx) => (
                <CardComponent
                  key={idx}
                  card={card}
                  faceDown={!card}
                  selected={selectedOwnCard === idx}
                  onClick={() => setSelectedOwnCard(idx)}
                  size="md"
                />
              ))}
            </div>

            <div className="ability-select-label">Opponent's card:</div>
            <div className="ability-player-select">
              <select value={selectedOppPlayer} onChange={e => { setSelectedOppPlayer(e.target.value); setSelectedOppCard(null); }}>
                <option value="">-- Select opponent --</option>
                {opponents.map(p => <option key={p.id} value={p.id} disabled={isFrozen(p.id)}>{isFrozen(p.id) ? `${p.name} 🔒 Frozen` : p.name}</option>)}
              </select>
            </div>
            {oppTarget && (
              <div className="ability-cards-row">
                {Array.from({ length: oppTarget.cardCount }).map((_, idx) => (
                  <CardComponent
                    key={idx}
                    card={oppTarget.cards[idx] ?? null}
                    faceDown={!oppTarget.cards[idx]}
                    selected={selectedOppCard === idx}
                    onClick={() => setSelectedOppCard(idx)}
                    size="md"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('do_swap', { myCardIndex: selectedOwnCard, targetPlayerId: selectedOppPlayer, targetCardIndex: selectedOppCard })}
              disabled={selectedOwnCard === null || !selectedOppPlayer || selectedOppCard === null}
            >
              Swap!
            </button>
            <button className="btn btn-secondary" onClick={() => emitAbility('skip')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Queen: peek opp select
  if (rank === 'Q' && step === 'peek_opp_select') {
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          <div className="ability-step-desc">Select an opponent's card to peek (you may then swap any two cards):</div>
          <div className="ability-player-select">
            <select value={selectedOppPlayer} onChange={e => { setSelectedOppPlayer(e.target.value); setSelectedOppCard(null); }}>
              <option value="">-- Select opponent --</option>
              {opponents.map(p => <option key={p.id} value={p.id} disabled={isFrozen(p.id)}>{isFrozen(p.id) ? `${p.name} 🔒 Frozen` : p.name}</option>)}
            </select>
          </div>
          {oppTarget && (
            <div className="ability-cards-row">
              {Array.from({ length: oppTarget.cardCount }).map((_, idx) => (
                <CardComponent
                  key={idx}
                  card={oppTarget.cards[idx] ?? null}
                  faceDown={!oppTarget.cards[idx]}
                  selected={selectedOppCard === idx}
                  onClick={() => setSelectedOppCard(idx)}
                  size="md"
                />
              ))}
            </div>
          )}
          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('peek_opp', { targetPlayerId: selectedOppPlayer, cardIndex: selectedOppCard })}
              disabled={!selectedOppPlayer || selectedOppCard === null}
            >
              Peek Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Queen: swap any two cards
  if (rank === 'Q' && step === 'queen_swap_select') {
    const peekedCard = abilityState.peekedOppCard;
    const peekedOppId = abilityState.peekedOppPlayerId;
    const peekedIdx = abilityState.peekedOppIndex;

    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          {peekedCard && (
            <div className="peeked-card-reveal">
              <div className="label">
                {players.find(p => p.id === peekedOppId)?.name ?? 'Opponent'}'s card at slot {(peekedIdx ?? 0) + 1}:
              </div>
              <CardComponent card={peekedCard} size="lg" />
            </div>
          )}
          <div className="ability-step-desc">Now swap any two cards on the table (or skip):</div>

          <div className="ability-select-grid">
            <div className="ability-select-label">Card 1:</div>
            <div className="ability-player-select">
              <select value={selectedP1Player} onChange={e => { setSelectedP1Player(e.target.value); setSelectedP1Card(null); }}>
                <option value="">-- Select player --</option>
                {players.map(p => <option key={p.id} value={p.id} disabled={isFrozen(p.id)}>{p.id === myPlayerId ? 'You' : isFrozen(p.id) ? `${p.name} 🔒 Frozen` : p.name}</option>)}
              </select>
            </div>
            {p1Target && (
              <div className="ability-cards-row">
                {Array.from({ length: p1Target.cardCount }).map((_, idx) => (
                  <CardComponent
                    key={idx}
                    card={p1Target.cards[idx] ?? null}
                    faceDown={!p1Target.cards[idx]}
                    selected={selectedP1Card === idx}
                    onClick={() => setSelectedP1Card(idx)}
                    size="md"
                  />
                ))}
              </div>
            )}

            <div className="ability-select-label">Card 2:</div>
            <div className="ability-player-select">
              <select value={selectedP2Player} onChange={e => { setSelectedP2Player(e.target.value); setSelectedP2Card(null); }}>
                <option value="">-- Select player --</option>
                {players.map(p => <option key={p.id} value={p.id} disabled={isFrozen(p.id)}>{p.id === myPlayerId ? 'You' : isFrozen(p.id) ? `${p.name} 🔒 Frozen` : p.name}</option>)}
              </select>
            </div>
            {p2Target && (
              <div className="ability-cards-row">
                {Array.from({ length: p2Target.cardCount }).map((_, idx) => (
                  <CardComponent
                    key={idx}
                    card={p2Target.cards[idx] ?? null}
                    faceDown={!p2Target.cards[idx]}
                    selected={selectedP2Card === idx}
                    onClick={() => setSelectedP2Card(idx)}
                    size="md"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('do_swap', { p1Id: selectedP1Player, p1CardIndex: selectedP1Card, p2Id: selectedP2Player, p2CardIndex: selectedP2Card })}
              disabled={!selectedP1Player || selectedP1Card === null || !selectedP2Player || selectedP2Card === null}
            >
              Swap!
            </button>
            <button className="btn btn-secondary" onClick={() => emitAbility('skip')}>
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // King: peek own
  if (rank === 'K' && step === 'peek_own_select') {
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          <div className="ability-step-desc">Step 1: Select one of YOUR cards to peek (you'll then peek an opponent's and may swap):</div>
          <div className="ability-cards-row">
            {me.cards.map((card, idx) => (
              <CardComponent
                key={idx}
                card={card}
                faceDown={!card}
                selected={selectedOwnCard === idx}
                onClick={() => setSelectedOwnCard(idx)}
                size="md"
              />
            ))}
          </div>
          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('peek_own', { cardIndex: selectedOwnCard })}
              disabled={selectedOwnCard === null}
            >
              Peek My Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  // King: peek opp
  if (rank === 'K' && step === 'peek_opp_select') {
    const peekedCard = abilityState.peekedOwnCard;
    const peekedIdx = abilityState.peekedOwnIndex;
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          {peekedCard && (
            <div className="peeked-card-reveal">
              <div className="label">Your card at slot {(peekedIdx ?? 0) + 1}:</div>
              <CardComponent card={peekedCard} size="lg" />
            </div>
          )}
          <div className="ability-step-desc">Step 2: Select an opponent's card to peek:</div>
          <div className="ability-player-select">
            <select value={selectedOppPlayer} onChange={e => { setSelectedOppPlayer(e.target.value); setSelectedOppCard(null); }}>
              <option value="">-- Select opponent --</option>
              {opponents.map(p => <option key={p.id} value={p.id} disabled={isFrozen(p.id)}>{isFrozen(p.id) ? `${p.name} 🔒 Frozen` : p.name}</option>)}
            </select>
          </div>
          {oppTarget && (
            <div className="ability-cards-row">
              {Array.from({ length: oppTarget.cardCount }).map((_, idx) => (
                <CardComponent
                  key={idx}
                  card={oppTarget.cards[idx] ?? null}
                  faceDown={!oppTarget.cards[idx]}
                  selected={selectedOppCard === idx}
                  onClick={() => setSelectedOppCard(idx)}
                  size="md"
                />
              ))}
            </div>
          )}
          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('peek_opp', { targetPlayerId: selectedOppPlayer, cardIndex: selectedOppCard })}
              disabled={!selectedOppPlayer || selectedOppCard === null}
            >
              Peek Their Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  // King: free swap after peeking both cards
  if (rank === 'K' && step === 'king_swap_select') {
    const myCard = abilityState.peekedOwnCard;
    const myIdx = abilityState.peekedOwnIndex;
    const oppCard = abilityState.peekedOppCard;
    const oppId = abilityState.peekedOppPlayerId;
    const oppIdx = abilityState.peekedOppIndex;
    const oppName = players.find(p => p.id === oppId)?.name ?? 'Opponent';

    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{ABILITY_NAMES[rank]}</div>
          {(myCard || oppCard) && (
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 8 }}>
              {myCard && (
                <div className="peeked-card-reveal">
                  <div className="label">Your slot {(myIdx ?? 0) + 1}:</div>
                  <CardComponent card={myCard} size="lg" />
                </div>
              )}
              {oppCard && (
                <div className="peeked-card-reveal">
                  <div className="label">{oppName}'s slot {(oppIdx ?? 0) + 1}:</div>
                  <CardComponent card={oppCard} size="lg" />
                </div>
              )}
            </div>
          )}
          <div className="ability-step-desc">Now swap any two cards on the table (or skip):</div>

          <div className="ability-select-grid">
            <div className="ability-select-label">Card 1:</div>
            <div className="ability-player-select">
              <select value={selectedP1Player} onChange={e => { setSelectedP1Player(e.target.value); setSelectedP1Card(null); }}>
                <option value="">-- Select player --</option>
                {players.map(p => <option key={p.id} value={p.id} disabled={isFrozen(p.id)}>{p.id === myPlayerId ? 'You' : isFrozen(p.id) ? `${p.name} 🔒 Frozen` : p.name}</option>)}
              </select>
            </div>
            {p1Target && (
              <div className="ability-cards-row">
                {Array.from({ length: p1Target.cardCount }).map((_, idx) => (
                  <CardComponent
                    key={idx}
                    card={p1Target.cards[idx] ?? null}
                    faceDown={!p1Target.cards[idx]}
                    selected={selectedP1Card === idx}
                    onClick={() => setSelectedP1Card(idx)}
                    size="md"
                  />
                ))}
              </div>
            )}

            <div className="ability-select-label">Card 2:</div>
            <div className="ability-player-select">
              <select value={selectedP2Player} onChange={e => { setSelectedP2Player(e.target.value); setSelectedP2Card(null); }}>
                <option value="">-- Select player --</option>
                {players.map(p => <option key={p.id} value={p.id} disabled={isFrozen(p.id)}>{p.id === myPlayerId ? 'You' : isFrozen(p.id) ? `${p.name} 🔒 Frozen` : p.name}</option>)}
              </select>
            </div>
            {p2Target && (
              <div className="ability-cards-row">
                {Array.from({ length: p2Target.cardCount }).map((_, idx) => (
                  <CardComponent
                    key={idx}
                    card={p2Target.cards[idx] ?? null}
                    faceDown={!p2Target.cards[idx]}
                    selected={selectedP2Card === idx}
                    onClick={() => setSelectedP2Card(idx)}
                    size="md"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="ability-actions">
            <button
              className="btn btn-primary"
              onClick={() => emitAbility('do_swap', { p1Id: selectedP1Player, p1CardIndex: selectedP1Card, p2Id: selectedP2Player, p2CardIndex: selectedP2Card })}
              disabled={!selectedP1Player || selectedP1Card === null || !selectedP2Player || selectedP2Card === null}
            >
              Swap!
            </button>
            <button className="btn btn-secondary" onClick={() => emitAbility('skip')}>
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
