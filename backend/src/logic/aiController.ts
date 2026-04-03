import type { Card } from './cardUtils';
import type { GameState } from './gameController';
import { analyzeHand, compareHands, HandType, type Hand } from './patternMatcher';

type Candidate = {
  cards: Card[];
  hand: Hand;
};

const sortAscending = (cards: Card[]): Card[] => [...cards].sort((a, b) => a.weight - b.weight);

const groupByWeight = (cards: Card[]): Map<number, Card[]> => {
  const groups = new Map<number, Card[]>();
  cards.forEach(card => {
    const group = groups.get(card.weight) ?? [];
    group.push(card);
    groups.set(card.weight, group);
  });
  return groups;
};

const countByWeight = (cards: Card[]): Map<number, number> => {
  const counts = new Map<number, number>();
  cards.forEach(card => counts.set(card.weight, (counts.get(card.weight) ?? 0) + 1));
  return counts;
};

const buildRuns = (weights: number[]): number[][] => {
  if (weights.length === 0) return [];
  const sorted = [...new Set(weights)].sort((a, b) => a - b);
  const runs: number[][] = [];
  let current = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) current.push(sorted[i]);
    else {
      runs.push(current);
      current = [sorted[i]];
    }
  }

  runs.push(current);
  return runs;
};

const getCampMate = (state: GameState, playerId: number): number | null => {
  const landlordIndex = state.landlordIndex;
  if (landlordIndex === null) return null;
  if (playerId === landlordIndex) return null;
  return state.players.find(player => player.id !== playerId && player.id !== landlordIndex)?.id ?? null;
};

const isSameCamp = (state: GameState, a: number, b: number): boolean => {
  if (state.landlordIndex === null) return false;
  return (a === state.landlordIndex) === (b === state.landlordIndex);
};

const removeCards = (source: Card[], used: Card[]): Card[] => {
  const usedIds = new Set(used.map(card => card.id));
  return source.filter(card => !usedIds.has(card.id));
};

const estimateHandChunks = (cards: Card[]): number => {
  if (cards.length === 0) return 0;
  const wholeHand = analyzeHand(cards);
  if (wholeHand.type !== HandType.None) return 1;

  const counts = countByWeight(cards);
  const pairWeights = [...counts.entries()].filter(([, count]) => count >= 2).map(([weight]) => weight).filter(weight => weight < 15);
  const singleWeights = [...counts.entries()].filter(([, count]) => count >= 1).map(([weight]) => weight).filter(weight => weight < 15);

  const straightRun = buildRuns(singleWeights).reduce((best, run) => Math.max(best, run.length), 0);
  const doubleRun = buildRuns(pairWeights).reduce((best, run) => Math.max(best, run.length), 0);

  let chunks = counts.size;
  if (straightRun >= 5) chunks -= Math.floor(straightRun / 5);
  if (doubleRun >= 3) chunks -= Math.floor(doubleRun / 3);

  return Math.max(1, chunks);
};

const evaluateRemainingShape = (cards: Card[]): number => {
  if (cards.length === 0) return -1000;

  const counts = countByWeight(cards);
  const groupEntries = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  const chunkPenalty = estimateHandChunks(cards) * 18;
  const singlePenalty = groupEntries.filter(([, count]) => count === 1).length * 10;
  const highSinglePenalty = groupEntries.filter(([weight, count]) => count === 1 && weight >= 14).length * 7;
  const controlPenalty = groupEntries.filter(([weight]) => weight >= 15).reduce((sum, [, count]) => sum + count * 2, 0);
  const tripleBonus = groupEntries.filter(([, count]) => count >= 3).length * 8;
  const bombBonus = groupEntries.filter(([, count]) => count === 4).length * 16;

  const wholeHand = analyzeHand(cards);
  const oneTurnBonus = wholeHand.type !== HandType.None ? 140 : 0;

  return cards.length * 4 + chunkPenalty + singlePenalty + highSinglePenalty + controlPenalty - tripleBonus - bombBonus - oneTurnBonus;
};

const addCandidate = (store: Map<string, Candidate>, cards: Card[]) => {
  const sorted = sortAscending(cards);
  const hand = analyzeHand(sorted);
  if (hand.type === HandType.None) return;
  const key = sorted.map(card => card.id).join('|');
  if (!store.has(key)) {
    store.set(key, { cards: sorted, hand });
  }
};

const addSingles = (store: Map<string, Candidate>, cards: Card[]) => {
  sortAscending(cards).forEach(card => addCandidate(store, [card]));
};

const addSets = (store: Map<string, Candidate>, cards: Card[], size: number) => {
  groupByWeight(cards).forEach(group => {
    if (group.length >= size) addCandidate(store, group.slice(0, size));
  });
};

const getAttachmentCardCost = (card: Card, totalCount: number): number => {
  const structurePenalty = totalCount === 1 ? 0 : totalCount === 2 ? 14 : totalCount === 3 ? 24 : 36;
  const highCardPenalty = card.weight >= 16 ? 22 : card.weight >= 15 ? 14 : card.weight >= 14 ? 8 : card.weight >= 13 ? 4 : 0;
  return structurePenalty + highCardPenalty + card.weight;
};

const chooseKAttachments = <T>(
  items: T[],
  need: number,
  limit: number,
): T[][] => {
  if (need === 0) return [[]];
  if (items.length < need) return [];

  const results: T[][] = [];
  const path: T[] = [];

  const dfs = (start: number) => {
    if (results.length >= limit) return;
    if (path.length === need) {
      results.push([...path]);
      return;
    }

    for (let i = start; i <= items.length - (need - path.length); i++) {
      path.push(items[i]);
      dfs(i + 1);
      path.pop();
      if (results.length >= limit) return;
    }
  };

  dfs(0);
  return results;
};

const getSingleAttachmentOptions = (
  cards: Card[],
  excludedWeights: number[],
  need: number,
  limit = 8,
): Card[][] => {
  const counts = countByWeight(cards);
  const pool = sortAscending(cards)
    .filter(card => !excludedWeights.includes(card.weight))
    .sort((a, b) => getAttachmentCardCost(a, counts.get(a.weight) ?? 1) - getAttachmentCardCost(b, counts.get(b.weight) ?? 1));

  return chooseKAttachments(pool, need, limit);
};

const getPairAttachmentOptions = (
  cards: Card[],
  excludedWeights: number[],
  need: number,
  limit = 8,
): Card[][] => {
  const groups = [...groupByWeight(cards).entries()]
    .filter(([weight, group]) => !excludedWeights.includes(weight) && group.length >= 2)
    .sort((a, b) => {
      const aCost = getAttachmentCardCost(a[1][0], a[1].length);
      const bCost = getAttachmentCardCost(b[1][0], b[1].length);
      return aCost - bCost;
    })
    .map(([, group]) => group.slice(0, 2));

  return chooseKAttachments(groups, need, limit).map(combo => combo.flat());
};

const addStraights = (store: Map<string, Candidate>, cards: Card[], exactLength?: number) => {
  const weights = [...groupByWeight(cards).keys()].filter(weight => weight < 15);
  buildRuns(weights).forEach(run => {
    const minLen = exactLength ?? 5;
    const maxLen = exactLength ?? run.length;
    for (let len = minLen; len <= maxLen; len++) {
      for (let start = 0; start + len <= run.length; start++) {
        const cardsInRun = run.slice(start, start + len).map(weight => groupByWeight(cards).get(weight)![0]);
        addCandidate(store, cardsInRun);
      }
    }
  });
};

const addDoubleStraights = (store: Map<string, Candidate>, cards: Card[], exactPairCount?: number) => {
  const groups = groupByWeight(cards);
  const pairWeights = [...groups.entries()].filter(([, group]) => group.length >= 2).map(([weight]) => weight).filter(weight => weight < 15);
  buildRuns(pairWeights).forEach(run => {
    const minPairs = exactPairCount ?? 3;
    const maxPairs = exactPairCount ?? run.length;
    for (let pairCount = minPairs; pairCount <= maxPairs; pairCount++) {
      for (let start = 0; start + pairCount <= run.length; start++) {
        const seq = run.slice(start, start + pairCount).flatMap(weight => groups.get(weight)!.slice(0, 2));
        addCandidate(store, seq);
      }
    }
  });
};

const addTripleWithAttachments = (
  store: Map<string, Candidate>,
  cards: Card[],
  attachmentMode: 'single' | 'pair',
  minTripleWeight?: number,
) => {
  const groups = groupByWeight(cards);
  const triples = [...groups.entries()]
    .filter(([, group]) => group.length >= 3)
    .map(([weight, group]) => ({ weight, cards: group.slice(0, 3) }))
    .filter(item => (minTripleWeight === undefined ? true : item.weight > minTripleWeight))
    .sort((a, b) => a.weight - b.weight);

  triples.forEach(triple => {
    if (attachmentMode === 'single') {
      getSingleAttachmentOptions(cards, [triple.weight], 1).forEach(wing => addCandidate(store, [...triple.cards, ...wing]));
      return;
    }

    getPairAttachmentOptions(cards, [triple.weight], 1).forEach(wing => addCandidate(store, [...triple.cards, ...wing]));
  });
};

const getPlaneRuns = (cards: Card[], exactLength?: number): number[][] => {
  const groups = groupByWeight(cards);
  const tripleWeights = [...groups.entries()].filter(([, group]) => group.length >= 3).map(([weight]) => weight).filter(weight => weight < 15);
  const results: number[][] = [];

  buildRuns(tripleWeights).forEach(run => {
    const minLen = exactLength ?? 2;
    const maxLen = exactLength ?? run.length;
    for (let len = minLen; len <= maxLen; len++) {
      for (let start = 0; start + len <= run.length; start++) {
        results.push(run.slice(start, start + len));
      }
    }
  });

  return results;
};

const addPlanes = (
  store: Map<string, Candidate>,
  cards: Card[],
  mode: 'pure' | 'single' | 'pair',
  exactLength?: number,
  minMainWeight?: number,
) => {
  const groups = groupByWeight(cards);
  getPlaneRuns(cards, exactLength).forEach(run => {
    if (minMainWeight !== undefined && run[0] <= minMainWeight) return;

    const body = run.flatMap(weight => groups.get(weight)!.slice(0, 3));
    if (mode === 'pure') {
      addCandidate(store, body);
      return;
    }

    if (mode === 'single') {
      getSingleAttachmentOptions(cards, run, run.length, 6).forEach(wing => addCandidate(store, [...body, ...wing]));
      return;
    }

    getPairAttachmentOptions(cards, run, run.length, 6).forEach(wing => addCandidate(store, [...body, ...wing]));
  });
};

const addBombsAndRocket = (store: Map<string, Candidate>, cards: Card[]) => {
  addSets(store, cards, 4);
  const jokers = sortAscending(cards).filter(card => card.weight >= 16);
  if (jokers.length === 2) addCandidate(store, jokers);
};

const getLeadCandidates = (cards: Card[]): Candidate[] => {
  const store = new Map<string, Candidate>();
  addSingles(store, cards);
  addSets(store, cards, 2);
  addSets(store, cards, 3);
  addTripleWithAttachments(store, cards, 'single');
  addTripleWithAttachments(store, cards, 'pair');
  addStraights(store, cards);
  addDoubleStraights(store, cards);
  addPlanes(store, cards, 'pure');
  addPlanes(store, cards, 'single');
  addPlanes(store, cards, 'pair');
  addBombsAndRocket(store, cards);
  return [...store.values()];
};

const getResponseCandidates = (cards: Card[], target: Hand): Candidate[] => {
  const store = new Map<string, Candidate>();
  const exactLength = target.cardCount;

  switch (target.type) {
    case HandType.Single:
      sortAscending(cards).filter(card => card.weight > target.mainWeight).forEach(card => addCandidate(store, [card]));
      break;
    case HandType.Pair:
      addSets(store, cards, 2);
      break;
    case HandType.Triple:
      addSets(store, cards, 3);
      break;
    case HandType.TripleWithOne:
      addTripleWithAttachments(store, cards, 'single', target.mainWeight);
      break;
    case HandType.TripleWithTwo:
      addTripleWithAttachments(store, cards, 'pair', target.mainWeight);
      break;
    case HandType.Straight:
      addStraights(store, cards, exactLength);
      break;
    case HandType.DoubleStraight:
      addDoubleStraights(store, cards, exactLength / 2);
      break;
    case HandType.PlanePure:
      addPlanes(store, cards, 'pure', exactLength / 3, target.mainWeight);
      break;
    case HandType.PlaneWithSingle:
      addPlanes(store, cards, 'single', exactLength / 4, target.mainWeight);
      break;
    case HandType.PlaneWithPair:
      addPlanes(store, cards, 'pair', exactLength / 5, target.mainWeight);
      break;
    case HandType.Bomb:
      addSets(store, cards, 4);
      break;
    default:
      break;
  }

  const regularCandidates = [...store.values()].filter(candidate => compareHands(target, candidate.hand));
  if (target.type !== HandType.Rocket) {
    const bombs = getLeadCandidates(cards).filter(candidate => candidate.hand.type === HandType.Bomb || candidate.hand.type === HandType.Rocket);
    regularCandidates.push(...bombs.filter(candidate => compareHands(target, candidate.hand)));
  }

  return regularCandidates;
};

const scoreLeadCandidate = (state: GameState, playerId: number, cards: Card[], candidate: Candidate): number => {
  const remaining = removeCards(cards, candidate.cards);
  const usesBomb = candidate.hand.type === HandType.Bomb || candidate.hand.type === HandType.Rocket;
  const enemyRemainings = state.players
    .filter(player => !isSameCamp(state, playerId, player.id))
    .map(player => player.cards.length);
  const urgentEnemy = enemyRemainings.some(count => count <= 2);
  const teammateId = getCampMate(state, playerId);
  const teammateLow = teammateId !== null && state.players[teammateId].cards.length <= 2;
  const preservePenalty = candidate.hand.mainWeight * 1.2;
  const bombPenalty = usesBomb ? 30 : 0;
  const unloadBonus = candidate.cards.length * 7;
  const controlBonus =
    urgentEnemy && (candidate.hand.type === HandType.Single || candidate.hand.type === HandType.Pair)
      ? Math.max(0, candidate.hand.mainWeight - 10) * -8
      : 0;
  const protectTeammateBonus =
    teammateLow && (candidate.hand.type === HandType.Single || candidate.hand.type === HandType.Pair) && candidate.hand.mainWeight >= 12
      ? -20
      : 0;
  return evaluateRemainingShape(remaining) + preservePenalty + bombPenalty - unloadBonus + controlBonus + protectTeammateBonus;
};

const scoreResponseCandidate = (
  state: GameState,
  playerId: number,
  candidate: Candidate,
): number => {
  const cards = state.players[playerId].cards;
  const remaining = removeCards(cards, candidate.cards);
  const usesBomb = candidate.hand.type === HandType.Bomb || candidate.hand.type === HandType.Rocket;
  const lastPlayer = state.lastHand!.playerIndex;
  const lastPlayerRemaining = state.players[lastPlayer].cards.length;
  const enemyUrgent = !isSameCamp(state, playerId, lastPlayer) && lastPlayerRemaining <= 2;
  const preservePenalty = candidate.hand.mainWeight * 1.6;
  const bombPenalty = usesBomb ? (enemyUrgent ? 6 : 40) : 0;
  const unloadBonus = candidate.cards.length * 5;
  const controlBonus =
    enemyUrgent && (candidate.hand.type === HandType.Single || candidate.hand.type === HandType.Pair)
      ? Math.max(0, candidate.hand.mainWeight - 10) * -6
      : 0;
  return evaluateRemainingShape(remaining) + preservePenalty + bombPenalty - unloadBonus + controlBonus;
};

// 评估手牌价值，决定是否叫地主
export const evaluateHandPower = (cards: Card[]): number => {
  const counts = countByWeight(cards);
  let score = 0;

  counts.forEach((count, weight) => {
    if (weight === 17) score += 10;
    else if (weight === 16) score += 8;
    else if (weight === 15) score += count * 4;
    else if (weight === 14) score += count * 2;
    else if (weight === 13) score += count;

    if (count === 4) score += 10;
    else if (count === 3) score += 4;
    else if (count === 2 && weight >= 13) score += 2;
  });

  const straightCandidates = getLeadCandidates(cards).filter(candidate => candidate.hand.type === HandType.Straight);
  const bestStraight = straightCandidates.reduce((best, candidate) => Math.max(best, candidate.cards.length), 0);
  if (bestStraight >= 5) score += bestStraight - 3;

  const doubleStraightCandidates = getLeadCandidates(cards).filter(candidate => candidate.hand.type === HandType.DoubleStraight);
  const bestDoubleStraight = doubleStraightCandidates.reduce((best, candidate) => Math.max(best, candidate.cards.length), 0);
  if (bestDoubleStraight >= 6) score += bestDoubleStraight / 2;

  score += Math.max(0, 8 - estimateHandChunks(cards)) * 2;

  return score;
};

export const decideBid = (cards: Card[]): boolean => {
  const score = evaluateHandPower(cards);
  const counts = countByWeight(cards);
  const bombCount = [...counts.values()].filter(count => count === 4).length;
  const controlCount = [...counts.entries()].filter(([weight]) => weight >= 15).reduce((sum, [, count]) => sum + count, 0);
  return score >= 18 || (score >= 15 && (bombCount > 0 || controlCount >= 3));
};

// 核心决策函数：决定出牌
export const decidePlay = (state: GameState, playerId: number): { action: 'play' | 'pass', cards: Card[] } => {
  const cards = sortAscending(state.players[playerId].cards);
  const campMate = getCampMate(state, playerId);

  const isFreeToPlay = !state.lastHand || state.passCount >= 2;
  if (isFreeToPlay) {
    const candidates = getLeadCandidates(cards);
    const regularCandidates = candidates.filter(candidate => candidate.hand.type !== HandType.Bomb && candidate.hand.type !== HandType.Rocket);
    const pool = regularCandidates.length > 0 ? regularCandidates : candidates;
    const best = pool.sort((a, b) => scoreLeadCandidate(state, playerId, cards, a) - scoreLeadCandidate(state, playerId, cards, b))[0];
    return best ? { action: 'play', cards: best.cards } : { action: 'play', cards: [cards[0]] };
  }

  const lastHand = state.lastHand!;
  const lastPlayerId = lastHand.playerIndex;
  const teammatePlayed = campMate !== null && lastPlayerId === campMate;
  const lastPlayerRemaining = state.players[lastPlayerId].cards.length;
  const landlordIndex = state.landlordIndex;
  const landlordRemaining = landlordIndex === null ? 99 : state.players[landlordIndex].cards.length;
  const lastPlayerIsEnemy = !isSameCamp(state, playerId, lastPlayerId);
  const landlordIsEnemy = landlordIndex !== null && !isSameCamp(state, playerId, landlordIndex);
  const urgentThreat = (lastPlayerIsEnemy && lastPlayerRemaining <= 2) || (landlordIsEnemy && landlordRemaining <= 2);

  if (
    teammatePlayed &&
    !urgentThreat &&
    lastHand.handDetail.type !== HandType.Bomb &&
    lastHand.handDetail.type !== HandType.Rocket &&
    lastHand.handDetail.mainWeight >= 11
  ) {
    return { action: 'pass', cards: [] };
  }

  const candidates = getResponseCandidates(cards, lastHand.handDetail);
  if (candidates.length === 0) {
    return { action: 'pass', cards: [] };
  }

  const safeCandidates = candidates.filter(candidate => candidate.hand.type !== HandType.Bomb && candidate.hand.type !== HandType.Rocket);
  const pool = safeCandidates.length > 0 ? safeCandidates : candidates;
  const best = pool.sort((a, b) => scoreResponseCandidate(state, playerId, a) - scoreResponseCandidate(state, playerId, b))[0];

  if (!best) return { action: 'pass', cards: [] };

  if (teammatePlayed && !urgentThreat) {
    const remaining = removeCards(cards, best.cards);
    const canGoOutSoon = analyzeHand(remaining).type !== HandType.None || remaining.length <= 2;
    if (!canGoOutSoon) return { action: 'pass', cards: [] };
  }

  return { action: 'play', cards: best.cards };
};
