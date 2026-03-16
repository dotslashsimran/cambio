export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';

export interface ClientCard {
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

export type AbilityStep =
  | 'peek_own_select'
  | 'peek_opp_select'
  | 'peek_own_reveal'
  | 'peek_opp_reveal'
  | 'jack_swap_decide'
  | 'jack_swap_select_opp'
  | 'queen_swap_select'
  | 'king_swap_confirm'
  | 'done';

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

export interface ClientPlayer {
  id: string;
  name: string;
  cards: (ClientCard | null)[];
  isCurrentTurn: boolean;
  cardCount: number;
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
}

export interface RoomPlayer {
  id: string;
  name: string;
  socketId: string;
}
