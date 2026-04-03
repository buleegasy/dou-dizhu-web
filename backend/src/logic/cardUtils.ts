export const Suit = {
  Spade: '♠',   // 黑桃
  Heart: '♥',   // 红桃
  Club: '♣',    // 梅花
  Diamond: '♦', // 方块
  Joker: '',    // 王
} as const;

export type Suit = typeof Suit[keyof typeof Suit];

export const Rank = {
  Three: '3',
  Four: '4',
  Five: '5',
  Six: '6',
  Seven: '7',
  Eight: '8',
  Nine: '9',
  Ten: '10',
  Jack: 'J',
  Queen: 'Q',
  King: 'K',
  Ace: 'A',
  Two: '2',
  BlackJoker: 'BJ',
  RedJoker: 'RJ',
} as const;

export type Rank = typeof Rank[keyof typeof Rank];

export interface Card {
  id: string; // 唯一标识符
  suit: Suit;
  rank: Rank;
  weight: number; // 权重
}

// 权重定义
const weightMap: Record<Rank, number> = {
  [Rank.Three]: 3,
  [Rank.Four]: 4,
  [Rank.Five]: 5,
  [Rank.Six]: 6,
  [Rank.Seven]: 7,
  [Rank.Eight]: 8,
  [Rank.Nine]: 9,
  [Rank.Ten]: 10,
  [Rank.Jack]: 11,
  [Rank.Queen]: 12,
  [Rank.King]: 13,
  [Rank.Ace]: 14,
  [Rank.Two]: 15,
  [Rank.BlackJoker]: 16,
  [Rank.RedJoker]: 17,
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  const suits = [Suit.Spade, Suit.Heart, Suit.Club, Suit.Diamond];
  const ranks = [
    Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven,
    Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen,
    Rank.King, Rank.Ace, Rank.Two
  ];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        weight: weightMap[rank],
      });
    }
  }

  deck.push({
    id: 'joker-black',
    suit: Suit.Joker,
    rank: Rank.BlackJoker,
    weight: weightMap[Rank.BlackJoker],
  });
  deck.push({
    id: 'joker-red',
    suit: Suit.Joker,
    rank: Rank.RedJoker,
    weight: weightMap[Rank.RedJoker],
  });

  return deck;
};

export const shuffle = (cards: Card[]): Card[] => {
  const newCards = [...cards];
  for (let i = newCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
  }
  return newCards;
};

export const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => {
    if (a.weight !== b.weight) {
      return b.weight - a.weight;
    }
    const suitOrder = [Suit.Spade, Suit.Heart, Suit.Club, Suit.Diamond, Suit.Joker];
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });
};
