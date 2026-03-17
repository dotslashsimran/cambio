export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export type GamePhase =
  | 'waiting'
  | 'peek'
  | 'playing'
  | 'ability'
  | 'last_turns'
  | 'game_over';

export interface ServerPlayer {
  id: string;
  name: string;
  socketId: string;
  hand: Card[];
  knownCardIndices: Set<number>;
  initialPeekCount: number;
  initialPeekDone: boolean;
}

export type AbilityStep =
  | 'peek_own_select'
  | 'peek_opp_select'
  | 'peek_own_reveal'
  | 'peek_opp_reveal'
  | 'jack_swap_decide'
  | 'jack_swap_select_opp'
  | 'queen_swap_select'
  | 'king_swap_select'
  | 'done';

export interface SwapInfo {
  p1Id: string;
  p1CardIndex: number;
  p2Id: string;
  p2CardIndex: number;
}

export interface AbilityState {
  playerId: string;
  abilityCard: Card;
  step: AbilityStep;
  peekedOwnIndex?: number;
  peekedOwnCard?: Card;
  peekedOppPlayerId?: string;
  peekedOppIndex?: number;
  peekedOppCard?: Card;
}

export interface ServerGameState {
  id: string;
  roomCode: string;
  phase: GamePhase;
  players: ServerPlayer[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  drawnCard: Card | null;
  drawnFrom: 'deck' | 'discard' | null;
  cambioCalledBy: string | null;
  lastTurnsLeft: number;
  abilityState: AbilityState | null;
  lastSwap?: SwapInfo;
}

// ---- Client-facing types ----

export interface ClientCard {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export interface ClientPlayer {
  id: string;
  name: string;
  cards: (ClientCard | null)[];
  isCurrentTurn: boolean;
  cardCount: number;
}

export interface ClientAbilityState {
  isMyAbility: boolean;
  abilityCard: ClientCard;
  step: AbilityStep;
  peekedOwnIndex?: number;
  peekedOwnCard?: ClientCard;
  peekedOppPlayerId?: string;
  peekedOppIndex?: number;
  peekedOppCard?: ClientCard;
}

export interface ClientGameState {
  phase: GamePhase;
  myPlayerId: string;
  players: ClientPlayer[];
  deckSize: number;
  discardPileTop: ClientCard | null;
  currentPlayerIndex: number;
  drawnCard: ClientCard | null;
  cambioCalledBy: string | null;
  lastTurnsLeft: number;
  abilityState: ClientAbilityState | null;
  canCallCambio: boolean;
  lastSwap?: SwapInfo;
}

export interface Room {
  code: string;
  hostId: string;
  players: Array<{ id: string; name: string; socketId: string }>;
  gameState: ServerGameState | null;
  chatMessages: Array<{ playerId: string; playerName: string; message: string; timestamp: number }>;
}
