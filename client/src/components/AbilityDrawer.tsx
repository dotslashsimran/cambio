import React from 'react';
import { ClientGameState, AbilityStep } from '../types';

interface AbilityDrawerProps {
  gameState: ClientGameState;
}

interface StepDef {
  step: AbilityStep;
  label: string;
}

const STEPS: Record<string, StepDef[]> = {
  '7': [
    { step: 'peek_own_select', label: 'Choosing own card' },
    { step: 'peek_own_reveal', label: 'Viewing card' },
  ],
  '8': [
    { step: 'peek_own_select', label: 'Choosing own card' },
    { step: 'peek_own_reveal', label: 'Viewing card' },
  ],
  '9': [
    { step: 'peek_opp_select', label: "Choosing opponent's card" },
    { step: 'peek_opp_reveal', label: "Viewing card" },
  ],
  '10': [
    { step: 'peek_opp_select', label: "Choosing opponent's card" },
    { step: 'peek_opp_reveal', label: "Viewing card" },
  ],
  'J': [
    { step: 'peek_own_select', label: 'Choosing own card to peek' },
    { step: 'jack_swap_decide', label: 'Deciding whether to swap' },
    { step: 'jack_swap_select_opp', label: 'Choosing cards to swap' },
  ],
  'Q': [
    { step: 'peek_opp_select', label: "Choosing opponent's card to peek" },
    { step: 'queen_swap_select', label: 'Choosing two cards to swap' },
  ],
  'K': [
    { step: 'peek_own_select', label: 'Choosing own card to peek' },
    { step: 'peek_opp_select', label: "Choosing opponent's card to peek" },
    { step: 'peek_opp_reveal', label: "Viewing opponent's card" },
    { step: 'king_swap_select', label: 'Choosing two cards to swap' },
  ],
};

const ABILITY_NAMES: Record<string, string> = {
  '7': 'Peek Own Card',
  '8': 'Peek Own Card',
  '9': 'Peek Opponent',
  '10': 'Peek Opponent',
  'J': 'Jack — Peek & Swap',
  'Q': 'Queen — Peek & Swap Any',
  'K': 'King — Peek Both & Swap',
};

export default function AbilityDrawer({ gameState }: AbilityDrawerProps) {
  const { abilityState, players } = gameState;
  if (!abilityState || abilityState.isMyAbility) return null;

  const rank = abilityState.abilityCard.rank;
  const step = abilityState.step;
  const owner = players.find(p => p.isCurrentTurn);
  const steps = STEPS[rank] ?? [];
  const currentIdx = steps.findIndex(s => s.step === step);

  const peekedOwnIdx = abilityState.peekedOwnIndex;
  const peekedOppPlayerId = abilityState.peekedOppPlayerId;
  const peekedOppIdx = abilityState.peekedOppIndex;
  const peekedOppName = players.find(p => p.id === peekedOppPlayerId)?.name;

  return (
    <div className="ability-drawer">
      <div className="ability-drawer-header">
        <div className="ability-drawer-label">ABILITY IN PROGRESS</div>
        <div className="ability-drawer-player">{owner?.name ?? 'Player'}</div>
        <div className="ability-drawer-name">{ABILITY_NAMES[rank] ?? rank}</div>
      </div>

      <div className="ability-drawer-steps">
        {steps.map((s, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={i}
              className={`ability-drawer-step${isCurrent ? ' step-current' : isDone ? ' step-done' : ' step-upcoming'}`}
            >
              <div className="step-dot" />
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      {(peekedOwnIdx !== undefined || peekedOppPlayerId) && (
        <div className="ability-drawer-info">
          {peekedOwnIdx !== undefined && (
            <div className="ability-drawer-info-row">
              <span className="info-label">Own slot</span>
              <span className="info-value">{peekedOwnIdx + 1}</span>
            </div>
          )}
          {peekedOppPlayerId && peekedOppIdx !== undefined && (
            <div className="ability-drawer-info-row">
              <span className="info-label">{peekedOppName ?? 'Opp'} slot</span>
              <span className="info-value">{peekedOppIdx + 1}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
