import { type Card, createDeck, shuffle, sortCards } from './cardUtils';
import { type Hand, analyzeHand, compareHands, HandType } from './patternMatcher';

export const GameStage = {
  Idle: 'Idle',
  Dealing: 'Dealing',
  Bidding: 'Bidding',
  Playing: 'Playing',
  ScoreBoard: 'ScoreBoard',
} as const;

export type GameStage = typeof GameStage[keyof typeof GameStage];

export interface Player {
  id: number;
  cards: Card[];
  isLandlord: boolean;
  score: number;
}

export interface GameState {
  stage: GameStage;
  players: Player[];
  bottomCards: Card[];
  turnIndex: number;
  landlordIndex: number | null;
  lastHand: {
    cards: Card[];
    handDetail: Hand;
    playerIndex: number;
  } | null;
  passCount: number;
}

export const initGameState = (): GameState => {
  return {
    stage: GameStage.Idle,
    players: [0, 1, 2].map(id => ({ id, cards: [], isLandlord: false, score: 0 })),
    bottomCards: [],
    turnIndex: 0,
    landlordIndex: null,
    lastHand: null,
    passCount: 0,
  };
};

export const dealCards = (state: GameState): GameState => {
  const deck = shuffle(createDeck());
  const newPlayers: Player[] = state.players.map(p => ({ ...p, cards: [] }));
  
  for (let i = 0; i < 51; i++) {
    newPlayers[i % 3].cards.push(deck[i]);
  }

  const bottomCards = deck.slice(51);

  newPlayers.forEach(p => {
    p.cards = sortCards(p.cards);
  });

  return {
    ...state,
    stage: GameStage.Bidding,
    players: newPlayers,
    bottomCards,
    turnIndex: 0,
  };
};

export const setLandlord = (state: GameState, index: number): GameState => {
  const newPlayers = state.players.map(p => {
    if (p.id === index) {
      return { 
        ...p, 
        isLandlord: true, 
        cards: sortCards([...p.cards, ...state.bottomCards]) 
      };
    }
    return { ...p, isLandlord: false };
  });

  return {
    ...state,
    stage: GameStage.Playing,
    players: newPlayers,
    landlordIndex: index,
    turnIndex: index,
  };
};

export const playCards = (state: GameState, playerIndex: number, selectedCards: Card[]): { state: GameState; error?: string } => {
  const currentHand = analyzeHand(selectedCards);
  
  if (currentHand.type === HandType.None) {
    return { state, error: '牌型非法' };
  }

  if (state.lastHand && state.passCount < 2) {
    if (!compareHands(state.lastHand.handDetail, currentHand)) {
      return { state, error: '牌太小或牌型不匹配' };
    }
  }

  const newPlayers = state.players.map(p => {
    if (p.id === playerIndex) {
      const remainingCards = p.cards.filter(pc => !selectedCards.find(sc => sc.id === pc.id));
      return { ...p, cards: remainingCards };
    }
    return p;
  });

  const hasWon = newPlayers[playerIndex].cards.length === 0;

  const nextState: GameState = {
    ...state,
    players: newPlayers,
    lastHand: {
      cards: selectedCards,
      handDetail: currentHand,
      playerIndex,
    },
    passCount: 0,
    turnIndex: (playerIndex + 1) % 3,
    stage: hasWon ? GameStage.ScoreBoard : state.stage,
  };

  return { state: nextState };
};

export const passTurn = (state: GameState, playerIndex: number): { state: GameState; error?: string } => {
  if (!state.lastHand || state.passCount >= 2) {
    return { state, error: '必跳过之后必须出牌（或首轮必须出牌）' };
  }

  const nextState: GameState = {
    ...state,
    passCount: state.passCount + 1,
    turnIndex: (playerIndex + 1) % 3,
  };

  return { state: nextState };
};
