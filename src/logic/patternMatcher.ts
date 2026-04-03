import type { Card } from './cardUtils';

export const HandType = {
  None: 'None',
  Single: '单张',
  Pair: '对子',
  Triple: '三张',
  TripleWithOne: '三带一',
  TripleWithTwo: '三带二',
  Straight: '顺子',
  DoubleStraight: '连对',
  PlanePure: '飞机',
  PlaneWithSingle: '飞机带单',
  PlaneWithPair: '飞机带对',
  QuadrupleWithTwo: '四带二',
  Bomb: '炸弹',
  Rocket: '火箭', // 王炸
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
  const groupCounts = Object.entries(groups)
    .map(([w, c]) => ({ weight: Number(w), count: c }))
    .sort((a, b) => b.count - a.count || b.weight - a.weight);

  const counts = groupCounts.map(g => g.count);

  // 1. 火箭 (王炸)
  if (count === 2 && groups[16] && groups[17]) {
    return { type: HandType.Rocket, mainWeight: 17, cardCount: 2 };
  }

  // 2. 炸弹
  if (count === 4 && counts[0] === 4) {
    return { type: HandType.Bomb, mainWeight: groupCounts[0].weight, cardCount: 4 };
  }

  // 3. 单张
  if (count === 1) {
    return { type: HandType.Single, mainWeight: weights[0], cardCount: 1 };
  }

  // 4. 对子
  if (count === 2 && counts[0] === 2) {
    return { type: HandType.Pair, mainWeight: weights[0], cardCount: 2 };
  }

  // 5. 三张
  if (count === 3 && counts[0] === 3) {
    return { type: HandType.Triple, mainWeight: weights[0], cardCount: 3 };
  }

  // 6. 三带一
  if (count === 4 && counts[0] === 3) {
    return { type: HandType.TripleWithOne, mainWeight: groupCounts[0].weight, cardCount: 4 };
  }

  // 7. 三带二 (对子)
  if (count === 5 && counts[0] === 3 && counts[1] === 2) {
    return { type: HandType.TripleWithTwo, mainWeight: groupCounts[0].weight, cardCount: 5 };
  }

  // 8. 顺子 (至少 5 张，不能包含 2 或王)
  if (count >= 5 && counts.every(c => c === 1)) {
    if (weights[weights.length - 1] < 15 && weights[weights.length - 1] - weights[0] === count - 1) {
      return { type: HandType.Straight, mainWeight: weights[0], cardCount: count };
    }
  }

  // 9. 连对 (至少 3 对，不能包含 2 或王)
  if (count >= 6 && count % 2 === 0 && counts.every(c => c === 2)) {
    const sortedWeights = weights.sort((a, b) => a - b);
    if (sortedWeights[sortedWeights.length - 1] < 15 && sortedWeights[sortedWeights.length - 1] - sortedWeights[0] === (count / 2) - 1) {
      return { type: HandType.DoubleStraight, mainWeight: sortedWeights[0], cardCount: count };
    }
  }

  // 10. 四带二 (带两单或两对)
  if (counts[0] === 4) {
    if (count === 6) {
      return { type: HandType.QuadrupleWithTwo, mainWeight: groupCounts[0].weight, cardCount: 6 };
    }
    if (count === 8 && counts[1] === 2 && counts[2] === 2) {
      return { type: HandType.QuadrupleWithTwo, mainWeight: groupCounts[0].weight, cardCount: 8 };
    }
  }

  // 11. 飞机 (核心逻辑)
  const triples = groupCounts.filter(g => g.count === 3).map(g => g.weight).sort((a, b) => a - b);
  if (triples.length >= 2) {
      // 找出最长的连续三张
      let maxSequence: number[] = [];
      let currentSequence: number[] = [triples[0]];
      
      for (let i = 1; i < triples.length; i++) {
          if (triples[i] < 15 && triples[i] === triples[i-1] + 1) {
              currentSequence.push(triples[i]);
          } else {
              if (currentSequence.length >= maxSequence.length) maxSequence = currentSequence;
              currentSequence = [triples[i]];
          }
      }
      if (currentSequence.length >= maxSequence.length) maxSequence = currentSequence;

      const len = maxSequence.length;
      if (len >= 2) {
          const mainWeight = maxSequence[0];
          // 纯飞机
          if (count === len * 3) return { type: HandType.PlanePure, mainWeight, cardCount: count };
          // 飞机带单张 (翅膀数量 = 飞机长度)
          if (count === len * 4) return { type: HandType.PlaneWithSingle, mainWeight, cardCount: count };
          // 飞机带对子 (翅膀数量 = 飞机长度)
          if (count === len * 5) {
              const otherCounts = groupCounts.filter(g => !maxSequence.includes(g.weight)).map(g => g.count);
              if (otherCounts.every(c => c === 2) && otherCounts.length === len) {
                return { type: HandType.PlaneWithPair, mainWeight, cardCount: count };
              }
          }
      }
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

  // 牌型必须一致且张数必须一致
  if (curr.type === prev.type && curr.cardCount === prev.cardCount) {
    return curr.mainWeight > prev.mainWeight;
  }

  return false;
};
