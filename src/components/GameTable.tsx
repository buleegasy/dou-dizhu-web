import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, Info, Users } from 'lucide-react';
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

interface GameTableProps {
  roomId: string;
  onExit: () => void;
}

const GameTable: React.FC<GameTableProps> = ({ roomId, onExit }) => {
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
      {/* 头部状态栏 */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onExit}
            className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors text-gray-500"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">测试房间</h1>
            <div className="flex items-center text-[10px] font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              ID: {roomId}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
                <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">Game Stage</div>
                <div className="text-xs font-bold text-gray-900 bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm uppercase tracking-tight">
                    {state.stage}
                </div>
            </div>
            <button 
                onClick={handleStart}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all"
            >
                {state.stage === GameStage.Idle ? '开始游戏' : '重新洗牌'}
            </button>
        </div>
      </div>

      {/* 对手数据面板 */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">对手 1 (左)</div>
            <div className="text-xl font-black text-gray-900">{state.players[1]?.cards.length || 0} <span className="text-xs font-medium text-gray-400">Cards</span></div>
          </div>
        </div>

        <div className="flex justify-center items-center space-x-1">
            <AnimatePresence mode="popLayout">
                {state.bottomCards.map(c => (
                    <Card key={c.id} card={c} isSmall className="!w-10 !h-14 !shadow-none" />
                ))}
                {state.bottomCards.length === 0 && (
                    <div className="flex space-x-1 opacity-20">
                        {[1, 2, 3].map(i => <div key={i} className="w-10 h-14 bg-gray-200 rounded-lg border border-gray-300 border-dashed" />)}
                    </div>
                )}
            </AnimatePresence>
        </div>

        <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center space-x-4 justify-end">
          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">对手 2 (右)</div>
            <div className="text-xl font-black text-gray-900">{state.players[2]?.cards.length || 0} <span className="text-xs font-medium text-gray-400">Cards</span></div>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* 出牌区域 */}
      <div className="flex-1 flex flex-col items-center justify-center border-y border-dashed border-gray-200 my-4 relative rounded-3xl group transition-colors hover:bg-gray-100/30">
        {state.lastHand && (
            <div className="flex flex-col items-center">
                <div className="flex items-center text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4 bg-purple-50/50 px-3 py-1 rounded-full border border-purple-100/50">
                    <Info size={10} className="mr-1.5" />
                    Player {state.lastHand.playerIndex === 0 ? 'You' : state.lastHand.playerIndex + 1} Played
                </div>
                <div className="flex space-x-[-20px]">
                    <AnimatePresence>
                        {state.lastHand.cards.map(c => <Card key={c.id} card={c} isSmall={true} />)}
                    </AnimatePresence>
                </div>
            </div>
        )}
        {state.passCount > 0 && state.turnIndex !== 0 && (
            <div className="text-2xl font-black text-gray-200 uppercase tracking-tighter select-none">Passed</div>
        )}
        
        {error && (
            <div className="absolute top-6 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-red-200 transition-all animate-bounce">
                {error}
            </div>
        )}
      </div>

      {/* 控制操作台 */}
      <div className="flex justify-center space-x-3 mb-6">
        {state.stage === GameStage.Bidding && (
            <button 
                onClick={handleGrabLandlord}
                className="px-10 py-3.5 bg-yellow-400 text-white rounded-2xl font-black shadow-lg shadow-yellow-100 hover:bg-yellow-500 hover:shadow-yellow-200 transition-all uppercase tracking-tight text-sm"
            >
                叫地主
            </button>
        )}
        {state.stage === GameStage.Playing && state.turnIndex === 0 && (
            <>
                <button 
                    onClick={handlePass}
                    disabled={!state.lastHand || state.passCount >= 2}
                    className="px-10 py-3.5 bg-white border border-gray-100 text-gray-400 rounded-2xl font-bold shadow-sm hover:bg-gray-50 disabled:opacity-30 transition-all uppercase tracking-tight text-sm"
                >
                    不出
                </button>
                <button 
                    onClick={handlePlay}
                    disabled={selectedIndices.length === 0}
                    className="px-12 py-3.5 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-200 hover:bg-purple-700 hover:shadow-purple-300 disabled:opacity-50 transition-all uppercase tracking-tight text-sm"
                >
                    出牌
                </button>
            </>
        )}
      </div>

      {/* 底部玩家手牌 */}
      <div className="w-full max-w-5xl mx-auto bg-white/50 backdrop-blur-sm rounded-t-[40px] border-x border-t border-gray-100 px-6">
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
