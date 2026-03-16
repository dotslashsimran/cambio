import { Card, Suit, Rank } from '../types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function cardValue(rank: Rank, suit: Suit): number {
  if (rank === 'JOKER') return 0;
  if (rank === 'K' && (suit === 'hearts' || suit === 'diamonds')) return -1;
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10);
}

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        value: cardValue(rank, suit),
      });
    }
  }

  // Add 2 jokers
  deck.push({ id: 'joker_1', suit: 'joker', rank: 'JOKER', value: 0 });
  deck.push({ id: 'joker_2', suit: 'joker', rank: 'JOKER', value: 0 });

  return shuffle(deck);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardHasAbility(rank: Rank): boolean {
  return ['7', '8', '9', '10', 'J', 'Q', 'K'].includes(rank);
}
