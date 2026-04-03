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

  it('should identify PlaneWithPair', () => {
    const hand = [
      createCard(Rank.Three, Suit.Spade), createCard(Rank.Three, Suit.Heart), createCard(Rank.Three, Suit.Club), // 333
      createCard(Rank.Four, Suit.Spade), createCard(Rank.Four, Suit.Heart), createCard(Rank.Four, Suit.Club),   // 444
      createCard(Rank.Five, Suit.Spade), createCard(Rank.Five, Suit.Heart),                                   // 55
      createCard(Rank.Six, Suit.Spade), createCard(Rank.Six, Suit.Heart),                                     // 66
    ];
    const result = analyzeHand(hand);
    expect(result.type).toBe(HandType.PlaneWithPair);
    expect(result.mainWeight).toBe(3);
    expect(result.cardCount).toBe(10);
  });

  it('should reject Plane with wrong wing count', () => {
    const hand = [
      createCard(Rank.Three, Suit.Spade), createCard(Rank.Three, Suit.Heart), createCard(Rank.Three, Suit.Club), // 333
      createCard(Rank.Four, Suit.Spade), createCard(Rank.Four, Suit.Heart), createCard(Rank.Four, Suit.Club),   // 444
      createCard(Rank.Five, Suit.Spade), createCard(Rank.Six, Suit.Heart), createCard(Rank.Seven, Suit.Club),    // 567 (3 wings for 2 triples)
    ];
    const result = analyzeHand(hand);
    expect(result.type).toBe(HandType.None);
  });

  it('should identify QuadrupleWithTwo', () => {
    const hand = [
      createCard(Rank.Ten, Suit.Spade), createCard(Rank.Ten, Suit.Heart), createCard(Rank.Ten, Suit.Club), createCard(Rank.Ten, Suit.Diamond),
      createCard(Rank.Three, Suit.Spade), createCard(Rank.Four, Suit.Heart),
    ];
    const result = analyzeHand(hand);
    expect(result.type).toBe(HandType.QuadrupleWithTwo);
    expect(result.mainWeight).toBe(10);
  });
});

describe('compareHands', () => {
  it('Higher single beats lower single', () => {
    const h3 = analyzeHand([createCard(Rank.Three)]);
    const h4 = analyzeHand([createCard(Rank.Four)]);
    expect(compareHands(h3, h4)).toBe(true);
  });

  it('Higher plane beats lower plane of same type', () => {
      const p34 = analyzeHand([
          createCard(Rank.Three, Suit.Spade), createCard(Rank.Three, Suit.Heart), createCard(Rank.Three, Suit.Club),
          createCard(Rank.Four, Suit.Spade), createCard(Rank.Four, Suit.Heart), createCard(Rank.Four, Suit.Club),
      ]);
      const p45 = analyzeHand([
          createCard(Rank.Four, Suit.Spade), createCard(Rank.Four, Suit.Heart), createCard(Rank.Four, Suit.Club),
          createCard(Rank.Five, Suit.Spade), createCard(Rank.Five, Suit.Heart), createCard(Rank.Five, Suit.Club),
      ]);
      expect(compareHands(p34, p45)).toBe(true);
  });

  it('Bomb beats single', () => {
    const single = analyzeHand([createCard(Rank.Two)]);
    const bomb = analyzeHand([createCard(Rank.Three), createCard(Rank.Three), createCard(Rank.Three), createCard(Rank.Three)]);
    expect(compareHands(single, bomb)).toBe(true);
  });
});
