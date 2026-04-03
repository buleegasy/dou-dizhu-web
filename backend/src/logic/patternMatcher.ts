import type { Card } from './cardUtils';

export const HandType = {
  None: 'None',
  Single: 'Single',
  Pair: 'Pair',
  Triple: 'Triple',
  TripleWithOne: 'TripleWithOne',
  TripleWithTwo: 'TripleWithTwo',
  Straight: 'Straight',
  DoubleStraight: 'DoubleStraight',
  Plane: 'Plane',
  QuadrupleWithTwo: 'QuadrupleWithTwo',
  Bomb: 'Bomb',
  Rocket: 'Rocket',
} as const;

export type HandType = typeof HandType[keyof typeof HandType];

export interface Hand {
  type: HandType;
  mainWeight: number;
  cardCount: number;
}

export const analyzeHand = (cards: Card[]): Hand => {
  const count = cards.length;
  if (count === 0) return { type: HandType.None, mainWeight: 0, cardCount: 0 };

  const groups: Record<number, number> = {};
  cards.forEach(c => {
    groups[c.weight] = (groups[c.weight] || 0) + 1;
  });

  const weights = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const groupCounts = Object.values(groups).sort((a, b) => b - a);

  if (count === 2 && groups[16] && groups[17]) {
    return { type: HandType.Rocket, mainWeight: 17, cardCount: 2 };
  }

  if (count === 4 && groupCounts[0] === 4) {
    return { type: HandType.Bomb, mainWeight: weights[0], cardCount: 4 };
  }

  if (count === 1) {
    return { type: HandType.Single, mainWeight: cards[0].weight, cardCount: 1 };
  }

  if (count === 2 && groupCounts[0] === 2) {
    return { type: HandType.Pair, mainWeight: weights[0], cardCount: 2 };
  }

  if (count === 3 && groupCounts[0] === 3) {
    return { type: HandType.Triple, mainWeight: weights[0], cardCount: 3 };
  }

  if (count === 4 && groupCounts[0] === 3) {
    const mainWeight = Number(Object.keys(groups).find(w => groups[Number(w)] === 3));
    return { type: HandType.TripleWithOne, mainWeight, cardCount: 4 };
  }

  if (count === 5 && groupCounts[0] === 3 && groupCounts[1] === 2) {
    const mainWeight = Number(Object.keys(groups).find(w => groups[Number(w)] === 3));
    return { type: HandType.TripleWithTwo, mainWeight, cardCount: 5 };
  }

  if (count >= 5 && groupCounts.every(c => c === 1)) {
    if (weights[weights.length - 1] < 15 && weights[weights.length - 1] - weights[0] === count - 1) {
      return { type: HandType.Straight, mainWeight: weights[0], cardCount: count };
    }
  }

  if (count >= 6 && count % 2 === 0 && groupCounts.every(c => c === 2)) {
    if (weights[weights.length - 1] < 15 && weights[weights.length - 1] - weights[0] === (count / 2) - 1) {
      return { type: HandType.DoubleStraight, mainWeight: weights[0], cardCount: count };
    }
  }

  if (count === 6 && groupCounts[0] === 4) {
    const mainWeight = Number(Object.keys(groups).find(w => groups[Number(w)] === 4));
    return { type: HandType.QuadrupleWithTwo, mainWeight, cardCount: 6 };
  }
  
  if (count === 8 && groupCounts[0] === 4 && groupCounts[1] === 2 && groupCounts[2] === 2) {
     const mainWeight = Number(Object.keys(groups).find(w => groups[Number(w)] === 4));
     return { type: HandType.QuadrupleWithTwo, mainWeight, cardCount: 8 };
  }

  const triples = Object.keys(groups).filter(w => groups[Number(w)] >= 3).map(Number).sort((a, b) => a - b);
  if (triples.length >= 2) {
    let maxSequence = 1;
    let currentSequence = 1;
    let sequenceStart = triples[0];
    let bestStart = triples[0];

    for (let i = 1; i < triples.length; i++) {
        if (triples[i] < 15 && triples[i] === triples[i-1] + 1) {
            currentSequence++;
        } else {
            if (currentSequence > maxSequence) {
                maxSequence = currentSequence;
                bestStart = sequenceStart;
            }
            currentSequence = 1;
            sequenceStart = triples[i];
        }
    }
    if (currentSequence > maxSequence) {
        maxSequence = currentSequence;
        bestStart = sequenceStart;
    }

    if (count === maxSequence * 3) return { type: HandType.Plane, mainWeight: bestStart, cardCount: count };
    if (count === maxSequence * 4) return { type: HandType.Plane, mainWeight: bestStart, cardCount: count };
    if (count === maxSequence * 5) return { type: HandType.Plane, mainWeight: bestStart, cardCount: count };
  }

  return { type: HandType.None, mainWeight: 0, cardCount: count };
};

export const compareHands = (prev: Hand, curr: Hand): boolean => {
  if (curr.type === HandType.None) return false;
  if (curr.type === HandType.Rocket) return true;
  if (prev.type === HandType.Rocket) return false;

  if (curr.type === HandType.Bomb) {
    if (prev.type !== HandType.Bomb) return true;
    return curr.mainWeight > prev.mainWeight;
  }

  if (prev.type === HandType.Bomb) return false;

  if (curr.type === prev.type && curr.cardCount === prev.cardCount) {
    return curr.mainWeight > prev.mainWeight;
  }

  return false;
};
