import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { GameState } from '../logic/gameController';
import { 
  initGameState, 
  dealCards, 
  setLandlord, 
  playCards, 
  passTurn,
  GameStage
} from '../logic/gameController';
import Hand from './Hand';
import Card from './Card';

const GameTable: React.FC = () => {
  const [state, setState] = useState<GameState>(initGameState());
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 初始化发牌
  const handleStart = () => {
    const newState = dealCards(initGameState());
    setState(newState);
    setError(null);
  };

  // 抢地主 (简单逻辑：直接让0号抢)
  const handleGrabLandlord = () => {
    setState(setLandlord(state, 0));
  };

  // 出牌
  const handlePlay = () => {
    const player = state.players[state.turnIndex];
    if (player.id !== 0) return; // 仅支持玩家(0号位)操作

    const selectedCards = selectedIndices.map(i => player.cards[i]);
    const { state: newState, error: playError } = playCards(state, 0, selectedCards);
    
    if (playError) {
      setError(playError);
      return;
    }

    setState(newState);
    setSelectedIndices([]);
    setError(null);
  };

  // 跳过
  const handlePass = () => {
    const { state: newState, error: passError } = passTurn(state, 0);
    if (passError) {
      setError(passError);
      return;
    }
    setState(newState);
    setSelectedIndices([]);
    setError(null);
  };

  const currentPlayer = state.players[0];

  return (
    <div className="flex-1 flex flex-col bg-gray-50 p-4 md:p-8">
      {/* 状态栏 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">简洁斗地主</h1>
        <div className="text-sm text-gray-500">阶段: {state.stage}</div>
        <button 
          onClick={handleStart}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
        >
          {state.stage === GameStage.Idle ? '开始游戏' : '重新洗牌'}
        </button>
      </div>

      {/* 对手区域 (占位) */}
      <div className="flex justify-between mb-12">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
          <div className="text-xs text-gray-500 mb-1">对手 1 (左)</div>
          <div className="text-lg font-bold">{state.players[1]?.cards.length || 0} 张</div>
        </div>
        <div className="flex flex-row space-x-2">
            <AnimatePresence>
                {state.bottomCards.map(c => <Card key={c.id} card={c} isSmall />)}
            </AnimatePresence>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
          <div className="text-xs text-gray-500 mb-1">对手 2 (右)</div>
          <div className="text-lg font-bold">{state.players[2]?.cards.length || 0} 张</div>
        </div>
      </div>

      {/* 出牌区域 (桌子中央) */}
      <div className="flex-1 flex flex-col items-center justify-center border-y border-dashed border-gray-300 my-4 relative">
        {state.lastHand && (
            <div className="flex flex-col items-center">
                <div className="text-xs text-gray-400 mb-2 font-mono">
                    玩家 {state.lastHand.playerIndex === 0 ? '你' : state.lastHand.playerIndex + 1} 出了：
                </div>
                <div className="flex space-x-[-20px]">
                    <AnimatePresence>
                        {state.lastHand.cards.map(c => <Card key={c.id} card={c} isSmall={true} />)}
                    </AnimatePresence>
                </div>
            </div>
        )}
        {state.passCount > 0 && state.turnIndex !== 0 && (
            <div className="text-lg font-bold text-gray-300">不出</div>
        )}
        
        {error && (
            <div className="absolute top-4 text-red-500 bg-red-50 px-4 py-1 rounded-full text-sm border border-red-200">
                {error}
            </div>
        )}
      </div>

      {/* 控制面板 */}
      <div className="flex justify-center space-x-4 mb-4">
        {state.stage === GameStage.Bidding && (
            <button 
                onClick={handleGrabLandlord}
                className="px-8 py-2 bg-yellow-500 text-white rounded-xl shadow-lg font-bold hover:bg-yellow-600"
            >
                叫地主
            </button>
        )}
        {state.stage === GameStage.Playing && state.turnIndex === 0 && (
            <>
                <button 
                    onClick={handlePass}
                    disabled={!state.lastHand || state.passCount >= 2}
                    className="px-8 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50"
                >
                    不出
                </button>
                <button 
                    onClick={handlePlay}
                    disabled={selectedIndices.length === 0}
                    className="px-8 py-2 bg-purple-600 text-white rounded-xl shadow-lg font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                    出牌
                </button>
            </>
        )}
      </div>

      {/* 玩家手牌区域 */}
      <div className="w-full max-w-4xl mx-auto">
        <Hand 
            cards={currentPlayer.cards} 
            selectedIndices={selectedIndices} 
            onToggleCard={(idx) => {
                setSelectedIndices(prev => 
                    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                );
            }}
        />
      </div>
    </div>
  );
};

export default GameTable;
