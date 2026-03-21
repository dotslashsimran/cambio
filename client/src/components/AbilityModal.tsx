import React from 'react';
import { ClientGameState } from '../types';
import { getSocket } from '../socket';
import CardComponent from './CardComponent';

interface AbilityModalProps {
  gameState: ClientGameState;
}

export default function AbilityModal({ gameState }: AbilityModalProps) {
  const socket = getSocket();
  const { abilityState, players } = gameState;
  if (!abilityState?.isMyAbility) return null;

  const { step, abilityCard, peekedOwnCard, peekedOwnIndex, peekedOppCard, peekedOppPlayerId, peekedOppIndex } = abilityState;
  const rank = abilityCard.rank;

  const closePeek = () => socket.emit('ability_action', { action: 'close_peek', data: {} });

  // 7/8: show peeked own card
  if ((rank === '7' || rank === '8') && step === 'peek_own_reveal') {
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">Your Card</div>
          <div className="ability-step-desc">Slot {(peekedOwnIndex ?? 0) + 1}:</div>
          {peekedOwnCard && (
            <div className="peeked-card-reveal card-flip-in">
              <CardComponent card={peekedOwnCard} size="lg" />
            </div>
          )}
          <div className="ability-actions">
            <button className="btn btn-primary" onClick={closePeek}>Got it!</button>
          </div>
        </div>
      </div>
    );
  }

  // 9/10: show peeked opp card
  if ((rank === '9' || rank === '10') && step === 'peek_opp_reveal') {
    const oppName = players.find(p => p.id === peekedOppPlayerId)?.name ?? 'Opponent';
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">{oppName}'s Card</div>
          <div className="ability-step-desc">Slot {(peekedOppIndex ?? 0) + 1}:</div>
          {peekedOppCard && (
            <div className="peeked-card-reveal card-flip-in">
              <CardComponent card={peekedOppCard} size="lg" />
            </div>
          )}
          <div className="ability-actions">
            <button className="btn btn-primary" onClick={closePeek}>Got it!</button>
          </div>
        </div>
      </div>
    );
  }

  // King: reveal both cards before swap
  if (rank === 'K' && step === 'peek_opp_reveal') {
    const oppName = players.find(p => p.id === peekedOppPlayerId)?.name ?? 'Opponent';
    return (
      <div className="ability-modal-backdrop">
        <div className="ability-modal">
          <div className="ability-title">King — Cards Revealed</div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-end' }}>
            {peekedOwnCard && (
              <div className="peeked-card-reveal">
                <div className="label">Your slot {(peekedOwnIndex ?? 0) + 1}:</div>
                <CardComponent card={peekedOwnCard} size="lg" />
              </div>
            )}
            {peekedOppCard && (
              <div className="peeked-card-reveal card-flip-in">
                <div className="label">{oppName}'s slot {(peekedOppIndex ?? 0) + 1}:</div>
                <CardComponent card={peekedOppCard} size="lg" />
              </div>
            )}
          </div>
          <div className="ability-actions">
            <button className="btn btn-primary" onClick={closePeek}>Proceed to Swap</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
