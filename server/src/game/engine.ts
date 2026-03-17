import { Card, ServerGameState, ServerPlayer, AbilityState, AbilityStep, ClientGameState, ClientPlayer, ClientCard, ClientAbilityState, SwapInfo, ReplaceInfo } from '../types';
import { createDeck } from './deck';
import { v4 as uuidv4 } from 'uuid';

export function createGame(
  roomCode: string,
  players: Array<{ id: string; name: string; socketId: string }>
): ServerGameState {
  const deck = createDeck();
  const serverPlayers: ServerPlayer[] = players.map(p => ({
    id: p.id,
    name: p.name,
    socketId: p.socketId,
    hand: [],
    knownCardIndices: new Set<number>(),
    initialPeekCount: 0,
    initialPeekDone: false,
  }));

  // Deal 4 cards to each player
  for (let i = 0; i < 4; i++) {
    for (const player of serverPlayers) {
      const card = deck.pop()!;
      player.hand.push(card);
    }
  }

  // Flip top card to start discard pile
  const firstDiscard = deck.pop()!;

  return {
    id: uuidv4(),
    roomCode,
    phase: 'peek',
    players: serverPlayers,
    deck,
    discardPile: [firstDiscard],
    currentPlayerIndex: 0,
    drawnCard: null,
    drawnFrom: null,
    cambioCalledBy: null,
    lastTurnsLeft: 0,
    snapWindow: null,
    abilityState: null,
  };
}

export function startInitialPeek(state: ServerGameState): ServerGameState {
  return { ...state, phase: 'peek' };
}

export function peekOwnCard(
  state: ServerGameState,
  playerId: string,
  cardIndex: number
): { state: ServerGameState; card: Card } | { error: string } {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  if (state.phase !== 'peek') return { error: 'Not in peek phase' };
  if (player.initialPeekDone) return { error: 'Already done peeking' };
  if (player.initialPeekCount >= 2) return { error: 'Already peeked 2 cards' };
  if (cardIndex < 0 || cardIndex >= player.hand.length) return { error: 'Invalid card index' };
  if (player.knownCardIndices.has(cardIndex)) return { error: 'Already peeked this card' };

  const card = player.hand[cardIndex];
  const updatedPlayer = {
    ...player,
    knownCardIndices: new Set([...player.knownCardIndices, cardIndex]),
    initialPeekCount: player.initialPeekCount + 1,
  };

  const updatedPlayers = state.players.map(p => p.id === playerId ? updatedPlayer : p);
  return { state: { ...state, players: updatedPlayers }, card };
}

export function markPeekDone(state: ServerGameState, playerId: string): ServerGameState {
  const updatedPlayers = state.players.map(p =>
    p.id === playerId ? { ...p, initialPeekDone: true } : p
  );

  const allDone = updatedPlayers.every(p => p.initialPeekDone);
  const newPhase = allDone ? 'playing' : state.phase;

  return { ...state, players: updatedPlayers, phase: newPhase };
}

export function isCurrentPlayer(state: ServerGameState, playerId: string): boolean {
  return state.players[state.currentPlayerIndex]?.id === playerId;
}

export function callCambio(state: ServerGameState, playerId: string): ServerGameState | { error: string } {
  if (!isCurrentPlayer(state, playerId)) return { error: 'Not your turn' };
  if (state.phase !== 'playing') return { error: 'Cannot call Cambio now' };
  if (state.drawnCard !== null) return { error: 'Already drew a card' };
  if (state.cambioCalledBy !== null) return { error: 'Cambio already called' };

  // Caller gets no more turn — advance to next player immediately.
  // Every other player gets exactly one more turn.
  const othersCount = state.players.length - 1;
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

  return {
    ...state,
    cambioCalledBy: playerId,
    phase: 'last_turns',
    lastTurnsLeft: othersCount,
    currentPlayerIndex: nextIndex,
  };
}

export function drawCard(
  state: ServerGameState,
  playerId: string,
  source: 'deck' | 'discard'
): ServerGameState | { error: string } {
  if (!isCurrentPlayer(state, playerId)) return { error: 'Not your turn' };
  if (state.phase !== 'playing' && state.phase !== 'last_turns') return { error: 'Not in playing phase' };
  if (state.drawnCard !== null) return { error: 'Already have a drawn card' };

  let card: Card;
  let newDeck = [...state.deck];
  let newDiscardPile = [...state.discardPile];

  if (source === 'deck') {
    if (newDeck.length === 0) {
      // Reshuffle discard pile except top card
      if (newDiscardPile.length <= 1) return { error: 'No cards available' };
      const top = newDiscardPile[newDiscardPile.length - 1];
      const reshuffled = newDiscardPile.slice(0, -1).sort(() => Math.random() - 0.5);
      newDeck = reshuffled;
      newDiscardPile = [top];
    }
    card = newDeck.pop()!;
  } else {
    if (newDiscardPile.length === 0) return { error: 'Discard pile is empty' };
    card = newDiscardPile.pop()!;
  }

  return {
    ...state,
    deck: newDeck,
    discardPile: newDiscardPile,
    drawnCard: card,
    drawnFrom: source,
    lastSwap: undefined,
    lastReplace: undefined,
  };
}

export function replaceCard(
  state: ServerGameState,
  playerId: string,
  cardIndex: number
): ServerGameState | { error: string } {
  if (!isCurrentPlayer(state, playerId)) return { error: 'Not your turn' };
  if (state.drawnCard === null) return { error: 'No drawn card' };

  const player = state.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  if (cardIndex < 0 || cardIndex >= player.hand.length) return { error: 'Invalid card index' };

  const oldCard = player.hand[cardIndex];
  const newHand = [...player.hand];
  newHand[cardIndex] = state.drawnCard;

  const newKnown = new Set([...player.knownCardIndices]);
  newKnown.delete(cardIndex);
  newKnown.add(cardIndex);

  const updatedPlayer = { ...player, hand: newHand, knownCardIndices: newKnown };
  const updatedPlayers = state.players.map(p => p.id === playerId ? updatedPlayer : p);
  const newDiscardPile = [...state.discardPile, oldCard];

  const lastReplace: ReplaceInfo = { playerId, cardIndex };
  const newState: ServerGameState = {
    ...state,
    players: updatedPlayers,
    discardPile: newDiscardPile,
    drawnCard: null,
    drawnFrom: null,
    lastReplace,
  };

  return advanceTurn(newState);
}

export function discardDrawn(
  state: ServerGameState,
  playerId: string
): ServerGameState | { error: string } {
  if (!isCurrentPlayer(state, playerId)) return { error: 'Not your turn' };
  if (state.drawnCard === null) return { error: 'No drawn card' };

  const card = state.drawnCard;
  const newDiscardPile = [...state.discardPile, card];
  const hasAbility = ['7', '8', '9', '10', 'J', 'Q', 'K'].includes(card.rank);

  let newState: ServerGameState = {
    ...state,
    discardPile: newDiscardPile,
    drawnCard: null,
    drawnFrom: null,
  };

  if (hasAbility) {
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    let step: AbilityStep;
    if (card.rank === '7' || card.rank === '8') step = 'peek_own_select';
    else if (card.rank === '9' || card.rank === '10') step = 'peek_opp_select';
    else if (card.rank === 'J') step = 'peek_own_select';
    else if (card.rank === 'Q') step = 'peek_opp_select';
    else step = 'peek_own_select'; // K

    newState = {
      ...newState,
      phase: 'ability',
      abilityState: { playerId: currentPlayer.id, abilityCard: card, step },
    };
  } else {
    newState = advanceTurn(newState);
  }

  return newState;
}

// Snap can be attempted any time during playing/last_turns by double-clicking a card.
// targetPlayerId=null means snapping own card; otherwise snapping an opponent's card.
// myCardIndex is the card the snapper gives away (only used for opponent snaps).
export function snap(
  state: ServerGameState,
  snappingPlayerId: string,
  myCardIndex: number,
  targetPlayerId: string | null,
  targetCardIndex: number | null
): { state: ServerGameState; success: boolean; message: string } {
  if (state.phase !== 'playing' && state.phase !== 'last_turns') {
    return { state, success: false, message: 'Cannot snap right now' };
  }
  if (state.discardPile.length === 0) {
    return { state, success: false, message: 'No card on discard pile' };
  }

  const snapper = state.players.find(p => p.id === snappingPlayerId);
  if (!snapper) return { state, success: false, message: 'Player not found' };

  const discardTop = state.discardPile[state.discardPile.length - 1];
  const discardValue = discardTop.value;

  if (targetPlayerId === null) {
    // Snapping own card
    if (myCardIndex < 0 || myCardIndex >= snapper.hand.length) {
      return { state: applyPenalty(state, snappingPlayerId), success: false, message: `${snapper.name} snapped wrong — penalty card!` };
    }
    const myCard = snapper.hand[myCardIndex];
    if (myCard.value === discardValue) {
      // Remove card from hand, put on discard
      const newHand = snapper.hand.filter((_, i) => i !== myCardIndex);
      const newKnown = remapKnownAfterRemove(snapper.knownCardIndices, myCardIndex);
      const updatedSnapper = { ...snapper, hand: newHand, knownCardIndices: newKnown };
      const updatedPlayers = state.players.map(p => p.id === snappingPlayerId ? updatedSnapper : p);
      return {
        state: { ...state, players: updatedPlayers, discardPile: [...state.discardPile, myCard] },
        success: true,
        message: `${snapper.name} snapped their own card!`,
      };
    } else {
      return { state: applyPenalty(state, snappingPlayerId), success: false, message: `${snapper.name} snapped wrong — penalty card!` };
    }
  } else {
    // Snapping an opponent's card
    if (targetCardIndex === null) {
      return { state: applyPenalty(state, snappingPlayerId), success: false, message: `${snapper.name} snapped wrong — penalty card!` };
    }
    const target = state.players.find(p => p.id === targetPlayerId);
    if (!target || targetCardIndex < 0 || targetCardIndex >= target.hand.length) {
      return { state: applyPenalty(state, snappingPlayerId), success: false, message: `${snapper.name} snapped wrong — penalty card!` };
    }
    const targetCard = target.hand[targetCardIndex];
    if (targetCard.value === discardValue) {
      // Target's card → discard pile; snapper gives myCardIndex card to target
      if (myCardIndex < 0 || myCardIndex >= snapper.hand.length) {
        return { state: applyPenalty(state, snappingPlayerId), success: false, message: 'Invalid card to give — penalty!' };
      }
      const cardToGive = snapper.hand[myCardIndex];

      // Snapper loses myCardIndex card
      const newSnapperHand = snapper.hand.filter((_, i) => i !== myCardIndex);
      const newSnapperKnown = remapKnownAfterRemove(snapper.knownCardIndices, myCardIndex);

      // Target loses targetCardIndex card (goes to discard), gains cardToGive at end
      const newTargetHand = target.hand.filter((_, i) => i !== targetCardIndex);
      newTargetHand.push(cardToGive);
      const newTargetKnown = remapKnownAfterRemove(target.knownCardIndices, targetCardIndex);
      // target doesn't know the new card they received

      const updatedPlayers = state.players.map(p => {
        if (p.id === snappingPlayerId) return { ...snapper, hand: newSnapperHand, knownCardIndices: newSnapperKnown };
        if (p.id === targetPlayerId) return { ...target, hand: newTargetHand, knownCardIndices: newTargetKnown };
        return p;
      });
      return {
        state: { ...state, players: updatedPlayers, discardPile: [...state.discardPile, targetCard] },
        success: true,
        message: `${snapper.name} snapped ${target.name}'s card!`,
      };
    } else {
      return { state: applyPenalty(state, snappingPlayerId), success: false, message: `${snapper.name} snapped wrong — penalty card!` };
    }
  }
}

function remapKnownAfterRemove(known: Set<number>, removedIndex: number): Set<number> {
  const newKnown = new Set<number>();
  for (const idx of known) {
    if (idx < removedIndex) newKnown.add(idx);
    else if (idx > removedIndex) newKnown.add(idx - 1);
    // idx === removedIndex is dropped (card is gone)
  }
  return newKnown;
}

function applyPenalty(state: ServerGameState, playerId: string): ServerGameState {
  let newDeck = [...state.deck];
  if (newDeck.length === 0) {
    if (state.discardPile.length <= 1) return state;
    const top = state.discardPile[state.discardPile.length - 1];
    newDeck = state.discardPile.slice(0, -1).sort(() => Math.random() - 0.5);
    state = { ...state, discardPile: [top] };
  }

  const penaltyCard = newDeck.pop()!;
  const updatedPlayers = state.players.map(p => {
    if (p.id !== playerId) return p;
    return { ...p, hand: [...p.hand, penaltyCard] };
  });

  return { ...state, deck: newDeck, players: updatedPlayers };
}


export function abilityAction(
  state: ServerGameState,
  playerId: string,
  action: string,
  data: any
): ServerGameState | { error: string } {
  if (!state.abilityState) return { error: 'No active ability' };
  if (state.abilityState.playerId !== playerId) return { error: 'Not your ability' };

  const ability = state.abilityState;
  const rank = ability.abilityCard.rank;

  // 7/8: peek own card
  if (rank === '7' || rank === '8') {
    if (ability.step === 'peek_own_select') {
      if (action !== 'peek_own') return { error: 'Expected peek_own action' };
      const { cardIndex } = data;
      const player = state.players.find(p => p.id === playerId)!;
      if (cardIndex < 0 || cardIndex >= player.hand.length) return { error: 'Invalid card index' };
      const peekedCard = player.hand[cardIndex];
      const newKnown = new Set([...player.knownCardIndices, cardIndex]);
      const updatedPlayers = state.players.map(p =>
        p.id === playerId ? { ...p, knownCardIndices: newKnown } : p
      );
      // Stay at reveal step — client must dismiss before we advance
      return {
        ...state,
        players: updatedPlayers,
        abilityState: { ...ability, step: 'peek_own_reveal', peekedOwnIndex: cardIndex, peekedOwnCard: peekedCard },
      };
    }
    if (ability.step === 'peek_own_reveal') {
      if (action !== 'close_peek') return { error: 'Expected close_peek action' };
      return advanceTurn({ ...state, abilityState: null });
    }
  }

  // 9/10: peek opponent's card
  if (rank === '9' || rank === '10') {
    if (ability.step === 'peek_opp_select') {
      if (action !== 'peek_opp') return { error: 'Expected peek_opp action' };
      const { targetPlayerId, cardIndex } = data;
      const target = state.players.find(p => p.id === targetPlayerId);
      if (!target) return { error: 'Target player not found' };
      if (cardIndex < 0 || cardIndex >= target.hand.length) return { error: 'Invalid card index' };
      const peekedCard = target.hand[cardIndex];
      // Stay at reveal step — client must dismiss before we advance
      return {
        ...state,
        abilityState: { ...ability, step: 'peek_opp_reveal', peekedOppPlayerId: targetPlayerId, peekedOppIndex: cardIndex, peekedOppCard: peekedCard },
      };
    }
    if (ability.step === 'peek_opp_reveal') {
      if (action !== 'close_peek') return { error: 'Expected close_peek action' };
      return advanceTurn({ ...state, abilityState: null });
    }
  }

  // Jack: peek own, then optionally swap with opponent
  if (rank === 'J') {
    if (ability.step === 'peek_own_select') {
      if (action !== 'peek_own') return { error: 'Expected peek_own action' };
      const { cardIndex } = data;
      const player = state.players.find(p => p.id === playerId)!;
      if (cardIndex < 0 || cardIndex >= player.hand.length) return { error: 'Invalid card index' };

      const peekedCard = player.hand[cardIndex];
      const newKnown = new Set([...player.knownCardIndices, cardIndex]);
      const updatedPlayers = state.players.map(p =>
        p.id === playerId ? { ...p, knownCardIndices: newKnown } : p
      );

      return {
        ...state,
        players: updatedPlayers,
        abilityState: {
          ...ability,
          step: 'jack_swap_decide',
          peekedOwnIndex: cardIndex,
          peekedOwnCard: peekedCard,
        },
      };
    }

    if (ability.step === 'jack_swap_decide') {
      if (action === 'skip') {
        return advanceTurn({ ...state, abilityState: { ...ability, step: 'done' } });
      }
      if (action === 'swap') {
        return {
          ...state,
          abilityState: { ...ability, step: 'jack_swap_select_opp' },
        };
      }
      return { error: 'Expected skip or swap action' };
    }

    if (ability.step === 'jack_swap_select_opp') {
      if (action !== 'do_swap') return { error: 'Expected do_swap action' };
      const { myCardIndex, targetPlayerId, targetCardIndex } = data;
      if (myCardIndex === undefined || myCardIndex === null) return { error: 'No own card selected' };

      return performSwap(state, playerId, myCardIndex, targetPlayerId, targetCardIndex, ability);
    }
  }

  // Queen: peek opponent, then swap any two cards
  if (rank === 'Q') {
    if (ability.step === 'peek_opp_select') {
      if (action !== 'peek_opp') return { error: 'Expected peek_opp action' };
      const { targetPlayerId, cardIndex } = data;
      const target = state.players.find(p => p.id === targetPlayerId);
      if (!target) return { error: 'Target player not found' };
      if (cardIndex < 0 || cardIndex >= target.hand.length) return { error: 'Invalid card index' };

      const peekedCard = target.hand[cardIndex];

      return {
        ...state,
        abilityState: {
          ...ability,
          step: 'queen_swap_select',
          peekedOppPlayerId: targetPlayerId,
          peekedOppIndex: cardIndex,
          peekedOppCard: peekedCard,
        },
      };
    }

    if (ability.step === 'queen_swap_select') {
      if (action === 'skip') {
        return advanceTurn({ ...state, abilityState: { ...ability, step: 'done' } });
      }
      if (action !== 'do_swap') return { error: 'Expected do_swap or skip action' };
      // data: { p1Id, p1CardIndex, p2Id, p2CardIndex }
      const { p1Id, p1CardIndex, p2Id, p2CardIndex } = data;
      return performSwap(state, p1Id, p1CardIndex, p2Id, p2CardIndex, ability);
    }
  }

  // King: peek own + opponent, then swap them
  if (rank === 'K') {
    if (ability.step === 'peek_own_select') {
      if (action !== 'peek_own') return { error: 'Expected peek_own action' };
      const { cardIndex } = data;
      const player = state.players.find(p => p.id === playerId)!;
      if (cardIndex < 0 || cardIndex >= player.hand.length) return { error: 'Invalid card index' };

      const peekedCard = player.hand[cardIndex];
      const newKnown = new Set([...player.knownCardIndices, cardIndex]);
      const updatedPlayers = state.players.map(p =>
        p.id === playerId ? { ...p, knownCardIndices: newKnown } : p
      );

      return {
        ...state,
        players: updatedPlayers,
        abilityState: {
          ...ability,
          step: 'peek_opp_select',
          peekedOwnIndex: cardIndex,
          peekedOwnCard: peekedCard,
        },
      };
    }

    if (ability.step === 'peek_opp_select') {
      if (action !== 'peek_opp') return { error: 'Expected peek_opp action' };
      const { targetPlayerId, cardIndex } = data;
      const target = state.players.find(p => p.id === targetPlayerId);
      if (!target) return { error: 'Target player not found' };
      if (cardIndex < 0 || cardIndex >= target.hand.length) return { error: 'Invalid card index' };

      const peekedCard = target.hand[cardIndex];

      return {
        ...state,
        abilityState: {
          ...ability,
          step: 'king_swap_select',
          peekedOppPlayerId: targetPlayerId,
          peekedOppIndex: cardIndex,
          peekedOppCard: peekedCard,
        },
      };
    }

    if (ability.step === 'king_swap_select') {
      if (action === 'skip') {
        return advanceTurn({ ...state, abilityState: { ...ability, step: 'done' } });
      }
      if (action !== 'do_swap') return { error: 'Expected do_swap or skip action' };
      // data: { p1Id, p1CardIndex, p2Id, p2CardIndex }
      const { p1Id, p1CardIndex, p2Id, p2CardIndex } = data;
      return performSwap(state, p1Id, p1CardIndex, p2Id, p2CardIndex, ability);
    }
  }

  return { error: `Unexpected action ${action} for rank ${rank} at step ${ability.step}` };
}

function performSwap(
  state: ServerGameState,
  p1Id: string,
  p1Idx: number,
  p2Id: string,
  p2Idx: number,
  ability: AbilityState
): ServerGameState {
  const p1 = state.players.find(p => p.id === p1Id);
  const p2 = state.players.find(p => p.id === p2Id);

  if (!p1 || !p2) return advanceTurn({ ...state, abilityState: { ...ability, step: 'done' } });

  const card1 = p1.hand[p1Idx];
  const card2 = p2.hand[p2Idx];

  const newP1Hand = [...p1.hand];
  newP1Hand[p1Idx] = card2;

  const newP2Hand = [...p2.hand];
  newP2Hand[p2Idx] = card1;

  // Neither player knows the swapped-in card anymore (unless it was their own swap in jack case)
  const p1Known = new Set([...p1.knownCardIndices]);
  const p2Known = new Set([...p2.knownCardIndices]);

  // After swap, neither knows what's at the swapped positions
  p1Known.delete(p1Idx);
  p2Known.delete(p2Idx);

  const updatedPlayers = state.players.map(p => {
    if (p.id === p1Id) return { ...p, hand: newP1Hand, knownCardIndices: p1Known };
    if (p.id === p2Id) return { ...p, hand: newP2Hand, knownCardIndices: p2Known };
    return p;
  });

  const lastSwap: SwapInfo = { p1Id, p1CardIndex: p1Idx, p2Id, p2CardIndex: p2Idx };
  return advanceTurn({
    ...state,
    players: updatedPlayers,
    lastSwap,
    abilityState: { ...ability, step: 'done' },
  });
}

export function advanceTurn(state: ServerGameState): ServerGameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

  if (state.phase === 'last_turns') {
    // Each call to advanceTurn means one more player has finished their last turn
    const newLastTurnsLeft = state.lastTurnsLeft - 1;
    if (newLastTurnsLeft <= 0) {
      return endGame({ ...state, currentPlayerIndex: nextIndex, lastTurnsLeft: 0, abilityState: null });
    }
    return {
      ...state,
      currentPlayerIndex: nextIndex,
      lastTurnsLeft: newLastTurnsLeft,
      drawnCard: null,
      abilityState: null,
      phase: 'last_turns',
    };
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    drawnCard: null,
    abilityState: null,
    phase: 'playing',
  };
}

export function endGame(state: ServerGameState): ServerGameState {
  return {
    ...state,
    phase: 'game_over',
    drawnCard: null,
    abilityState: null,
  };
}

export function buildClientState(state: ServerGameState, forPlayerId: string): ClientGameState {
  const myPlayer = state.players.find(p => p.id === forPlayerId);

  const clientPlayers: ClientPlayer[] = state.players.map(p => {
    const cards: (ClientCard | null)[] = p.hand.map((card) => {
      // Only reveal cards in game_over phase — all other times cards are face-down
      // (players must remember from their brief peek; no persistent face-up display)
      if (state.phase === 'game_over') {
        return { id: card.id, suit: card.suit, rank: card.rank, value: card.value };
      }
      return null;
    });

    return {
      id: p.id,
      name: p.name,
      cards,
      isCurrentTurn: state.players[state.currentPlayerIndex]?.id === p.id,
      cardCount: p.hand.length,
    };
  });

  let abilityState: ClientAbilityState | null = null;
  if (state.abilityState) {
    const ab = state.abilityState;
    abilityState = {
      isMyAbility: ab.playerId === forPlayerId,
      abilityCard: ab.abilityCard,
      step: ab.step,
      peekedOwnIndex: ab.peekedOwnIndex,
      peekedOwnCard: ab.peekedOwnCard,
      peekedOppPlayerId: ab.peekedOppPlayerId,
      peekedOppIndex: ab.peekedOppIndex,
      peekedOppCard: ab.peekedOppCard,
    };

    // Only show peeked cards to the ability owner
    if (ab.playerId !== forPlayerId) {
      abilityState.peekedOwnCard = undefined;
      abilityState.peekedOppCard = undefined;
    }
  }

  const isCurrentPlayer = state.players[state.currentPlayerIndex]?.id === forPlayerId;
  const canCallCambio = isCurrentPlayer &&
    state.drawnCard === null &&
    state.cambioCalledBy === null &&
    (state.phase === 'playing' || state.phase === 'last_turns');

  return {
    phase: state.phase,
    myPlayerId: forPlayerId,
    players: clientPlayers,
    deckSize: state.deck.length,
    discardPileTop: state.discardPile.length > 0
      ? (() => {
          const c = state.discardPile[state.discardPile.length - 1];
          return { id: c.id, suit: c.suit, rank: c.rank, value: c.value };
        })()
      : null,
    currentPlayerIndex: state.currentPlayerIndex,
    drawnCard: isCurrentPlayer && state.drawnCard
      ? (() => {
          const c = state.drawnCard;
          return { id: c.id, suit: c.suit, rank: c.rank, value: c.value };
        })()
      : null,
    cambioCalledBy: state.cambioCalledBy,
    lastTurnsLeft: state.lastTurnsLeft,
    abilityState,
    canCallCambio,
    lastSwap: state.lastSwap,
    lastReplace: state.lastReplace,
  };
}
