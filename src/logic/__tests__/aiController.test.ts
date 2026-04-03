import { describe, expect, it } from 'vitest';
import { decideBid, decidePlay, evaluateHandPower } from '../aiController';
import { Rank, Suit, type Card } from '../cardUtils';
import { GameStage, type GameState } from '../gameController';
import { analyzeHand } from '../patternMatcher';

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

let cardId = 0;
const createCard = (rank: Rank, suit: Suit = Suit.Spade): Card => ({
  id: `${rank}-${suit}-${cardId++}`,
  rank,
  suit,
  weight: weightMap[rank],
});

const createState = (playersCards: Card[][]): GameState => ({
  stage: GameStage.Playing,
  players: playersCards.map((cards, id) => ({
    id,
    cards,
    isLandlord: id === 0,
    score: 0,
  })),
  bottomCards: [],
  turnIndex: 0,
  landlordIndex: 0,
  lastHand: null,
  passCount: 0,
  bidAttempts: {},
  lastActionTimestamp: Date.now(),
  history: [],
});

describe('aiController', () => {
  it('prefers leading with a multi-card combo instead of a loose single', () => {
    const state = createState([
      [
        createCard(Rank.Three, Suit.Spade),
        createCard(Rank.Three, Suit.Heart),
        createCard(Rank.Three, Suit.Club),
        createCard(Rank.Four, Suit.Spade),
        createCard(Rank.Four, Suit.Heart),
        createCard(Rank.Nine, Suit.Spade),
      ],
      [createCard(Rank.Five)],
      [createCard(Rank.Six)],
    ]);

    const decision = decidePlay(state, 0);
    expect(decision.action).toBe('play');
    expect(decision.cards).toHaveLength(5);
    expect(analyzeHand(decision.cards).cardCount).toBe(5);
  });

  it('passes to support a farmer teammate who already played a high single', () => {
    const state = createState([
      [createCard(Rank.Two), createCard(Rank.Ace), createCard(Rank.Five), createCard(Rank.Four)],
      [createCard(Rank.Queen)],
      [createCard(Rank.RedJoker, Suit.Joker), createCard(Rank.King), createCard(Rank.Nine), createCard(Rank.Seven)],
    ]);

    state.landlordIndex = 0;
    state.players[0].isLandlord = true;
    state.players[2].isLandlord = false;
    state.turnIndex = 2;
    state.lastHand = {
      cards: [state.players[1].cards[0]],
      handDetail: analyzeHand([state.players[1].cards[0]]),
      playerIndex: 1,
    };

    const decision = decidePlay(state, 2);
    expect(decision.action).toBe('pass');
  });

  it('uses a bomb to stop an opponent who is about to go out', () => {
    const state = createState([
      [createCard(Rank.Ace)],
      [
        createCard(Rank.Five, Suit.Spade),
        createCard(Rank.Five, Suit.Heart),
        createCard(Rank.Five, Suit.Club),
        createCard(Rank.Five, Suit.Diamond),
      ],
      [createCard(Rank.King), createCard(Rank.Queen)],
    ]);

    state.landlordIndex = 0;
    state.players[0].isLandlord = true;
    state.players[1].isLandlord = false;
    state.players[2].isLandlord = false;
    state.turnIndex = 1;
    state.lastHand = {
      cards: [state.players[0].cards[0]],
      handDetail: analyzeHand([state.players[0].cards[0]]),
      playerIndex: 0,
    };

    const decision = decidePlay(state, 1);
    expect(decision.action).toBe('play');
    expect(analyzeHand(decision.cards).type).toBe('炸弹');
  });

  it('keeps pairs intact when responding with triple-with-one', () => {
    const state = createState([
      [
        createCard(Rank.Seven, Suit.Spade),
        createCard(Rank.Seven, Suit.Heart),
        createCard(Rank.Seven, Suit.Club),
        createCard(Rank.Three, Suit.Spade),
        createCard(Rank.Five, Suit.Spade),
        createCard(Rank.Nine, Suit.Spade),
        createCard(Rank.Nine, Suit.Heart),
      ],
      [createCard(Rank.Four)],
      [createCard(Rank.Six)],
    ]);

    const targetCards = [
      createCard(Rank.Five, Suit.Heart),
      createCard(Rank.Five, Suit.Club),
      createCard(Rank.Five, Suit.Diamond),
      createCard(Rank.Jack, Suit.Spade),
    ];
    state.lastHand = {
      cards: targetCards,
      handDetail: analyzeHand(targetCards),
      playerIndex: 1,
    };
    state.turnIndex = 0;

    const decision = decidePlay(state, 0);
    expect(decision.action).toBe('play');
    expect(analyzeHand(decision.cards).type).toBe('三带一');
    expect(decision.cards.some(card => card.weight === 9)).toBe(false);
  });

  it('leads higher control cards when an opponent is down to one card', () => {
    const state = createState([
      [
        createCard(Rank.Three, Suit.Spade),
        createCard(Rank.Four, Suit.Spade),
        createCard(Rank.King, Suit.Spade),
        createCard(Rank.Ace, Suit.Spade),
      ],
      [createCard(Rank.Five)],
      [createCard(Rank.Six, Suit.Spade), createCard(Rank.Six, Suit.Heart), createCard(Rank.Seven)],
    ]);

    state.landlordIndex = 2;
    state.players[0].isLandlord = false;
    state.players[1].isLandlord = false;
    state.players[2].isLandlord = true;
    state.turnIndex = 0;

    const decision = decidePlay(state, 0);
    expect(decision.action).toBe('play');
    expect(analyzeHand(decision.cards).type).toBe('单张');
    expect(decision.cards[0].weight).toBeGreaterThanOrEqual(13);
  });

  it('rates strong landlord hands above weak scattered hands', () => {
    const strong = [
      createCard(Rank.RedJoker, Suit.Joker),
      createCard(Rank.BlackJoker, Suit.Joker),
      createCard(Rank.Two, Suit.Spade),
      createCard(Rank.Two, Suit.Heart),
      createCard(Rank.Two, Suit.Club),
      createCard(Rank.Ace, Suit.Spade),
      createCard(Rank.Ace, Suit.Heart),
      createCard(Rank.King, Suit.Spade),
      createCard(Rank.King, Suit.Heart),
    ];
    const weak = [
      createCard(Rank.Three),
      createCard(Rank.Five),
      createCard(Rank.Seven),
      createCard(Rank.Nine),
      createCard(Rank.Jack),
      createCard(Rank.Queen),
      createCard(Rank.King),
      createCard(Rank.Ace),
      createCard(Rank.Eight),
    ];

    expect(evaluateHandPower(strong)).toBeGreaterThan(evaluateHandPower(weak));
    expect(decideBid(strong)).toBe(true);
    expect(decideBid(weak)).toBe(false);
  });
});
