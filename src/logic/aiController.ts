import type { Card } from './cardUtils';
import type { GameState } from './gameController';
import { HandType } from './patternMatcher';

// 评估手牌价值，决定是否叫地主
export const evaluateHandPower = (cards: Card[]): number => {
    let score = 0;
    const weights: Record<number, number> = {};
    cards.forEach(c => {
        weights[c.weight] = (weights[c.weight] || 0) + 1;
        if (c.weight === 17) score += 8; // 大王
        if (c.weight === 16) score += 6; // 小王
        if (c.weight === 15) score += 3; // 2
        if (c.weight === 14) score += 1; // A
    });

    Object.values(weights).forEach(count => {
        if (count === 4) score += 6; // 有炸弹加大量分
        if (count === 3) score += 2; // 有三张加分（利于带牌或变飞机）
    });

    return score;
};

export const decideBid = (cards: Card[]): boolean => {
    return evaluateHandPower(cards) >= 5;
};

// 提取所有可能的同一牌型组合
const findSets = (cards: Card[], size: number): Card[][] => {
    const groups: Record<number, Card[]> = {};
    cards.forEach(c => {
        if (!groups[c.weight]) groups[c.weight] = [];
        groups[c.weight].push(c);
    });
    const sets: Card[][] = [];
    Object.values(groups).forEach(group => {
        if (group.length >= size) sets.push(group.slice(0, size));
    });
    return sets.sort((a, b) => a[0].weight - b[0].weight);
};

// 找出最长连续顺子 (5张+, 不含 2 和王)
const findStraight = (cards: Card[]): Card[] | null => {
    const singles = cards.filter(c => c.weight < 15);
    const weights = [...new Set(singles.map(c => c.weight))].sort((a, b) => a - b);
    let best: number[] = [];
    let cur: number[] = [weights[0]];
    for (let i = 1; i < weights.length; i++) {
        if (weights[i] === weights[i - 1] + 1) cur.push(weights[i]);
        else {
            if (cur.length >= 5 && cur.length > best.length) best = cur;
            cur = [weights[i]];
        }
    }
    if (cur.length >= 5 && cur.length > best.length) best = cur;
    if (best.length < 5) return null;
    const result: Card[] = [];
    best.forEach(w => {
        const c = cards.find(card => card.weight === w);
        if (c) result.push(c);
    });
    return result;
};

// ====================================================================
// 核心决策函数：决定出牌
// ====================================================================
export const decidePlay = (state: GameState, playerId: number): { action: 'play' | 'pass', cards: Card[] } => {
    const player = state.players[playerId];
    const cards = [...player.cards].sort((a, b) => a.weight - b.weight);

    // --- 情况 1：首发出牌（lastHand 为空或 passCount >= 2 意味着上圈没人接，回到首发） ---
    const isFreeToPlay = !state.lastHand || state.passCount >= 2;
    if (isFreeToPlay) {
        // 只剩 1 张直接出
        if (cards.length === 1) return { action: 'play', cards: [...cards] };
        
        // 优先尝试出顺子（速度快，消耗多）
        const straight = findStraight(cards);
        if (straight && straight.length >= 5) return { action: 'play', cards: straight };
        
        // 其次出最小对子
        const pairs = findSets(cards, 2);
        if (pairs.length > 0 && pairs[0][0].weight < 14) return { action: 'play', cards: pairs[0] };
        
        // 兜底：出最小单张
        return { action: 'play', cards: [cards[0]] };
    }

    // --- 情况 2：跟牌 ---
    const last = state.lastHand!.handDetail;
    const isLandlord = state.landlordIndex === playerId;
    
    // 队友出的牌很大，让他走（识别先出方和自己的地主关系）
    const lastPlayerIsLandlord = state.landlordIndex === state.lastHand!.playerIndex;
    const isBothSameCamp = isLandlord === lastPlayerIsLandlord;
    if (isBothSameCamp && last.mainWeight >= 13 && last.type !== HandType.Bomb && last.type !== HandType.Rocket) {
        return { action: 'pass', cards: [] };
    }

    // 根据上一手的类型，找出最小能压的牌
    switch (last.type) {
        case HandType.Single: {
            // 尽量用小牌压，优先不拆对子
            const singles = cards.filter(c => c.weight > last.mainWeight);
            // 先找孤张（不成对的）
            const groups: Record<number, number> = {};
            cards.forEach(c => { groups[c.weight] = (groups[c.weight] || 0) + 1; });
            const loner = singles.find(c => groups[c.weight] === 1);
            if (loner) return { action: 'play', cards: [loner] };
            if (singles.length > 0) return { action: 'play', cards: [singles[0]] };
            break;
        }
        case HandType.Pair: {
            const pairs = findSets(cards, 2);
            const match = pairs.find(p => p[0].weight > last.mainWeight);
            if (match) return { action: 'play', cards: match };
            break;
        }
        case HandType.Triple: {
            const triples = findSets(cards, 3);
            const match = triples.find(p => p[0].weight > last.mainWeight);
            if (match) return { action: 'play', cards: match };
            break;
        }
        case HandType.TripleWithOne: {
            const triples = findSets(cards, 3);
            const match = triples.find(p => p[0].weight > last.mainWeight);
            if (match) {
                const rest = cards.filter(c => c.weight !== match[0].weight);
                if (rest.length > 0) return { action: 'play', cards: [...match, rest[0]] };
            }
            break;
        }
        case HandType.Bomb: {
            const bombs = findSets(cards, 4);
            const match = bombs.find(p => p[0].weight > last.mainWeight);
            if (match) return { action: 'play', cards: match };
            break;
        }
        default:
            break;
    }

    // 任意类型被炸弹/王炸压制的紧急救场
    if (last.type !== HandType.Rocket) {
        // 形势危急时（对手快打完了）才出炸弹
        const enemyRemaining = state.players[state.lastHand!.playerIndex].cards.length;
        if (enemyRemaining <= 4 && !isBothSameCamp) {
            const bombs = findSets(cards, 4);
            if (bombs.length > 0) return { action: 'play', cards: bombs[0] };
            const wangs = cards.filter(c => c.weight >= 16);
            if (wangs.length === 2) return { action: 'play', cards: wangs };
        }
    }

    return { action: 'pass', cards: [] };
};
