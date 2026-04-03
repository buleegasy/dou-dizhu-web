import { describe, it, expect } from 'vitest';
import { analyzeHand, compareHands, HandType } from '../patternMatcher';
import { Rank, Suit, type Card } from '../cardUtils';

const createCard = (rank: Rank, suit: Suit = Suit.Spade): Card => {
  const weightMap: Record<Rank, number> = {
    [Rank.Three]: 3, [Rank.Four]: 4, [Rank.Five]: 5, [Rank.Six]: 6, [Rank.Seven]: 7,
    [Rank.Eight]: 8, [Rank.Nine]: 9, [Rank.Ten]: 10, [Rank.Jack]: 11, [Rank.Queen]: 12,
    [Rank.King]: 13, [Rank.Ace]: 14, [Rank.Two]: 15, [Rank.BlackJoker]: 16, [Rank.RedJoker]: 17,
  };
  return { id: `${rank}-${suit}`, rank, suit, weight: weightMap[rank] };
};

describe('analyzeHand', () => {
  it('should identify Rocket (Wang Zha)', () => {
    const hand = [createCard(Rank.BlackJoker, Suit.Joker), createCard(Rank.RedJoker, Suit.Joker)];
    const result = analyzeHand(hand);
    expect(result.type).toBe(HandType.Rocket);
  });

  it('should identify Bomb', () => {
    const hand = [
      createCard(Rank.Eight, Suit.Spade),
      createCard(Rank.Eight, Suit.Heart),
      createCard(Rank.Eight, Suit.Club),
      createCard(Rank.Eight, Suit.Diamond),
    ];
    const result = analyzeHand(hand);
    expect(result.type).toBe(HandType.Bomb);
    expect(result.mainWeight).toBe(8);
  });

  it('should identify Straight', () => {
    const hand = [
      createCard(Rank.Five),
      createCard(Rank.Six),
      createCard(Rank.Seven),
      createCard(Rank.Eight),
      createCard(Rank.Nine),
    ];
    const result = analyzeHand(hand);
    expect(result.type).toBe(HandType.Straight);
    expect(result.mainWeight).toBe(5);
    expect(result.cardCount).toBe(5);
  });

  it('should identify TripleWithOne', () => {
    const hand = [
      createCard(Rank.Ten),
      createCard(Rank.Ten),
      createCard(Rank.Ten),
      createCard(Rank.Three),
    ];
    const result = analyzeHand(hand);
    expect(result.type).toBe(HandType.TripleWithOne);
    expect(result.mainWeight).toBe(10);
  });
});

describe('compareHands', () => {
  it('Rocket beats everything', () => {
    const rocket = analyzeHand([createCard(Rank.BlackJoker, Suit.Joker), createCard(Rank.RedJoker, Suit.Joker)]);
    const bomb = analyzeHand([createCard(Rank.Ace), createCard(Rank.Ace), createCard(Rank.Ace), createCard(Rank.Ace)]);
    expect(compareHands(bomb, rocket)).toBe(true);
  });

  it('Bigger bomb beats smaller bomb', () => {
    const smallBomb = analyzeHand([createCard(Rank.Three), createCard(Rank.Three), createCard(Rank.Three), createCard(Rank.Three)]);
    const bigBomb = analyzeHand([createCard(Rank.Four), createCard(Rank.Four), createCard(Rank.Four), createCard(Rank.Four)]);
    expect(compareHands(smallBomb, bigBomb)).toBe(true);
  });

  it('Bomb beats single', () => {
    const single = analyzeHand([createCard(Rank.Two)]);
    const bomb = analyzeHand([createCard(Rank.Three), createCard(Rank.Three), createCard(Rank.Three), createCard(Rank.Three)]);
    expect(compareHands(single, bomb)).toBe(true);
  });

  it('Higher single beats lower single', () => {
    const h3 = analyzeHand([createCard(Rank.Three)]);
    const h4 = analyzeHand([createCard(Rank.Four)]);
    expect(compareHands(h3, h4)).toBe(true);
  });

  it('Cannot compare different types (non-bomb)', () => {
    const single = analyzeHand([createCard(Rank.Two)]);
    const pair = analyzeHand([createCard(Rank.Three), createCard(Rank.Three)]);
    expect(compareHands(single, pair)).toBe(false);
  });
});
