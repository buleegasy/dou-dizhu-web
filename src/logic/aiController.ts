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
        if (count === 4) score += 6; // 有炸弹加分
    });

    return score;
};

export const decideBid = (cards: Card[]): boolean => {
    // 得分高于 8 分则叫地主
    return evaluateHandPower(cards) >= 8;
};

// 提取所有可能的同一牌型组合（简易版：提取单、双、三、四）
const findSets = (cards: Card[], size: number): Card[][] => {
    const weights: Record<number, Card[]> = {};
    cards.forEach(c => {
        if (!weights[c.weight]) weights[c.weight] = [];
        weights[c.weight].push(c);
    });

    const sets: Card[][] = [];
    Object.values(weights).forEach(group => {
        if (group.length >= size) {
            sets.push(group.slice(0, size));
        }
    });
    return sets.sort((a, b) => a[0].weight - b[0].weight);
};

// 决定出牌（启发式简化版）
export const decidePlay = (state: GameState, playerId: number): { action: 'play' | 'pass', cards?: Card[] } => {
    const player = state.players[playerId];
    const cards = [...player.cards].sort((a, b) => a.weight - b.weight); // 从小到大

    // 1. 首发出牌：挑最小的组合打出去
    if (!state.lastHand || state.passCount >= 2) {
        // 启发式：如果手里有最小的飞机或顺子（目前暂用简单逻辑：先出连对，再出顺子，再对子，再单张）
        const pairs = findSets(cards, 2);
        if (pairs.length > 0 && pairs[0][0].weight < 12) {
            return { action: 'play', cards: pairs[0] };
        }
        
        // 兜底出最小的单张
        return { action: 'play', cards: [cards[0]] };
    }

    const last = state.lastHand.handDetail;
    const isTeammate = state.landlordIndex !== null && 
        (state.landlordIndex === state.lastHand.playerIndex) === (state.landlordIndex === playerId);
    
    // 如果队友打的牌很大，就不接了
    if (isTeammate && last.mainWeight >= 13 && last.type !== HandType.Bomb) {
        return { action: 'pass' };
    }

    // 2. 接别人的牌
    // 找出和别人一样牌型且更大的组合。
    // 这里为了简化：只处理单张、对子、三张、炸弹的“完美匹配”。
    // 凡是带翅膀、顺子这类复杂逻辑，AI在算力受限下暂时跳过（选 Pass）。
    
    if (last.type === HandType.Single) {
        const candidate = cards.find(c => c.weight > last.mainWeight);
        if (candidate) return { action: 'play', cards: [candidate] };
    }
    
    if (last.type === HandType.Pair) {
        const pairs = findSets(cards, 2);
        const match = pairs.find(p => p[0].weight > last.mainWeight);
        if (match) return { action: 'play', cards: match };
    }
    
    if (last.type === HandType.Triple) {
        const triples = findSets(cards, 3);
        const match = triples.find(p => p[0].weight > last.mainWeight);
        if (match) return { action: 'play', cards: match };
    }
    
    if (last.type === HandType.Bomb) {
        const bombs = findSets(cards, 4);
        const match = bombs.find(p => p[0].weight > last.mainWeight);
        if (match) return { action: 'play', cards: match };
    }

    // 拼炸弹救场（如果快输了或者自己是地主且必须拦截）
    // 简化逻辑：如果是地主，别人快赢了，丢炸弹。
    if (!isTeammate) {
        const bombs = findSets(cards, 4);
        if (bombs.length > 0 && last.type !== HandType.Bomb) {
            // 如果对方剩牌小于5张，砸
            const enemyRemaining = state.players[state.lastHand.playerIndex].cards.length;
            if (enemyRemaining <= 5) {
                return { action: 'play', cards: bombs[0] };
            }
        }
        
        // 有王炸吗？
        const wangs = cards.filter(c => c.weight >= 16);
        if (wangs.length === 2 && last.type !== HandType.Rocket) {
            const enemyRemaining = state.players[state.lastHand.playerIndex].cards.length;
            if (enemyRemaining <= 2) { // 迫不得已再出
                return { action: 'play', cards: wangs };
            }
        }
    }

    return { action: 'pass' };
};
