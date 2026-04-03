import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Info, Users, CheckCircle2, AlertCircle, Bot, UserPlus, Clock } from 'lucide-react';
import type { GameState } from '../logic/gameController';
import { 
  initGameState, 
  GameStage
} from '../logic/gameController';
import { analyzeHand, compareHands, HandType } from '../logic/patternMatcher';
import { GameSync } from '../logic/gameSync';
import Hand from './Hand';
import Card from './Card';

interface GameTableProps {
  roomId: string;
  onExit: () => void;
  aiCount?: number; // 0=三人联机, 1=二人+1AI, 2=一人+2AI
}

const GameTable: React.FC<GameTableProps> = ({ roomId, onExit, aiCount = 0 }) => {
  const [state, setState] = useState<GameState>(initGameState());
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(25);
  
  const syncRef = useRef<GameSync | null>(null);

  useEffect(() => {
    syncRef.current = new GameSync(
      (newState, pId) => {
        setState(newState);
        if (pId !== undefined) setPlayerId(pId);
      },
      (msg) => setError(msg)
    );

    syncRef.current.connect(roomId);

    return () => {
      syncRef.current?.disconnect();
    };
  }, [roomId]);

  // 倒计时修复：使用函数式更新，彺彻消除闭包问题
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []); // 只运行一次

  // 当轮次或阶段变化时重置倒计时
  useEffect(() => {
    setTimeLeft(25);
  }, [state.turnIndex, state.stage]);

  // 实时分析当前选中的牌
  const selectedHandDetail = useMemo(() => {
    if (playerId === null) return null;
    const player = state.players[playerId];
    const selectedCards = selectedIndices.map(i => player.cards[i]);
    if (selectedCards.length === 0) return null;
    return analyzeHand(selectedCards);
  }, [selectedIndices, state.players, playerId]);

  // 校验当前选择是否可以出牌
  const playabilityStatus = useMemo(() => {
    if (!selectedHandDetail || playerId === null) return { canPlay: false, reason: '请选择扑克牌' };
    if (state.turnIndex !== playerId) return { canPlay: false, reason: '还没轮到你' };

    // 如果选中的牌型无效
    if (selectedHandDetail.type === HandType.None) {
      return { canPlay: false, reason: '无效牌型' };
    }

    // 如果不是首行出牌（即有上手牌需要压制）
    if (state.lastHand && state.passCount < 2) {
      const canBeat = compareHands(state.lastHand.handDetail, selectedHandDetail);
      if (!canBeat) return { canPlay: false, reason: '牌太小或类型不配' };
    }

    return { canPlay: true, reason: '合法出牌', type: selectedHandDetail.type };
  }, [selectedHandDetail, state.lastHand, state.passCount, state.turnIndex, playerId]);

  const handleStart = () => {
    // 根据 aiCount 先添加 AI 广播给其他同局的座位
    if (aiCount > 0) {
      // 例：玩家是 0号，加 AI 从座位 1、2 开始
      for (let i = 0; i < aiCount; i++) {
        const seatToFill = (1 + i) % 3; // seats 1, 2
        syncRef.current?.sendAction({ type: 'add_ai', index: seatToFill });
      }
    }
    syncRef.current?.sendAction({ type: 'deal' });
    setError(null);
  };

  const handleGrabLandlord = () => {
    syncRef.current?.sendAction({ type: 'landlord', index: playerId });
  };

  const handlePassBid = () => {
    syncRef.current?.sendAction({ type: 'pass_bid' });
  };

  const handlePlay = () => {
    if (!playabilityStatus.canPlay || playerId === null) return;

    const player = state.players[playerId];
    const selectedCards = selectedIndices.map(i => player.cards[i]);
    
    syncRef.current?.sendAction({ type: 'play', cards: selectedCards });
    setSelectedIndices([]);
    setError(null);
  };

  const handlePass = () => {
    if (playerId === null || state.turnIndex !== playerId) return;
    
    syncRef.current?.sendAction({ type: 'pass' });
    setSelectedIndices([]);
    setError(null);
  };

  const handleAddAi = (seatIndex: number) => {
    syncRef.current?.sendAction({ type: 'add_ai', index: seatIndex });
  };

  const currentPlayer = playerId !== null ? state.players[playerId] : state.players[0];
  const isMyTurn = playerId !== null && state.turnIndex === playerId;

  // 辅助渲染：头像与倒计时
  const renderPlayerAvatar = (pIndex: number, label: string, isLeft: boolean = false) => {
      const p = state.players[pIndex];
      const isTurn = state.turnIndex === pIndex;
      const isBiddingOrPlaying = state.stage === GameStage.Bidding || state.stage === GameStage.Playing;
      
      return (
        <div className={`p-4 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center space-x-4 ${!isLeft ? 'justify-end' : ''}`}>
          <div className="relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${p?.isAi ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-400'} ${isTurn && isBiddingOrPlaying ? 'ring-4 ring-purple-400 scale-110 shadow-lg' : ''}`}>
                {p?.isAi ? <Bot size={24} /> : <Users size={20} />}
              </div>
              {isTurn && isBiddingOrPlaying && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                      {timeLeft}
                  </div>
              )}
          </div>
          <div className={`flex-1 flex justify-between items-center ${!isLeft ? 'flex-row-reverse text-right' : ''}`}>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight flex items-center">
                    {p?.isAi ? `🤖 AI 托管 (${label})` : `玩家 ${pIndex + 1} (${label})`}
                </div>
                <div className="text-xl font-black text-gray-900">
                    {p?.cards.length || 0} <span className="text-xs font-medium text-gray-400">Cards</span>
                </div>
              </div>
              {!p?.isAi && state.stage === GameStage.Idle && (
                  <button onClick={() => handleAddAi(pIndex)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-xl transition-colors">
                      <UserPlus size={18} />
                  </button>
              )}
          </div>
        </div>
      );
  };

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
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {playerId !== null ? `玩家 ${playerId + 1} 的视角` : '连接中...'}
            </h1>
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
            {state.stage === GameStage.Idle && (
                <button 
                    onClick={handleStart}
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all"
                >
                    开始游戏
                </button>
            )}
        </div>
      </div>

      {/* 对手数据面板 */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {playerId !== null && renderPlayerAvatar((playerId + 1) % 3, '左', true)}

        <div className="flex justify-center items-center space-x-1">
            <AnimatePresence mode="popLayout">
                {state.bottomCards.map(c => (
                    <Card key={c.id} card={c} isSmall className="!w-10 !h-14 !shadow-none" />
                ))}
            </AnimatePresence>
        </div>

        {playerId !== null && renderPlayerAvatar((playerId + 2) % 3, '右', false)}
      </div>

      {/* 出牌区域 */}
      <div className="flex-1 flex flex-col items-center justify-center border-y border-dashed border-gray-200 my-4 relative rounded-3xl group transition-colors hover:bg-gray-100/30">
        {state.lastHand && (
            <div className="flex flex-col items-center">
                <div className="flex items-center text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4 bg-purple-50/50 px-3 py-1 rounded-full border border-purple-100/50">
                    <Info size={10} className="mr-1.5" />
                    Player {state.lastHand.playerIndex === playerId ? 'You' : state.lastHand.playerIndex + 1} Played
                </div>
                <div className="flex space-x-[-20px]">
                    <AnimatePresence>
                        {state.lastHand.cards.map(c => <Card key={c.id} card={c} isSmall={true} />)}
                    </AnimatePresence>
                </div>
            </div>
        )}
        {state.passCount > 0 && state.turnIndex !== playerId && (
            <div className="text-2xl font-black text-gray-200 uppercase tracking-tighter select-none">Passed</div>
        )}
        
        {error && (
            <div className="absolute top-6 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-red-200 transition-all animate-bounce">
                {error}
            </div>
        )}
      </div>

      {/* 控制操作台 */}
      <div className="flex flex-col items-center mb-6">
        {/* 实时反馈提示与倒计时 */}
        <div className="flex flex-col items-center space-y-2 mb-4">
            <AnimatePresence mode="wait">
                {selectedIndices.length > 0 && isMyTurn && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wide border ${playabilityStatus.canPlay ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}
                    >
                        {playabilityStatus.canPlay ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        <span>{playabilityStatus.canPlay ? `${playabilityStatus.type}` : `${playabilityStatus.reason}`}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {isMyTurn && (state.stage === GameStage.Bidding || state.stage === GameStage.Playing) && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-black italic tracking-tighter ${timeLeft <= 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                    <Clock size={12} />
                    <span>00:{timeLeft.toString().padStart(2, '0')}</span>
                </div>
            )}
        </div>

        <div className="flex justify-center space-x-3 w-full">
            {state.stage === GameStage.Bidding && state.turnIndex === playerId && (
                <>
                    <button 
                        onClick={handlePassBid}
                        className="px-10 py-3.5 bg-white border border-gray-100 text-gray-400 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all uppercase tracking-tight text-sm"
                    >
                        不叫
                    </button>
                    <button 
                        onClick={handleGrabLandlord}
                        className="px-10 py-3.5 bg-yellow-400 text-white rounded-2xl font-black shadow-lg shadow-yellow-100 hover:bg-yellow-500 hover:shadow-yellow-200 transition-all uppercase tracking-tight text-sm"
                    >
                        叫地主
                    </button>
                </>
            )}
            {state.stage === GameStage.Playing && isMyTurn && (
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
                        disabled={!playabilityStatus.canPlay}
                        className={`px-12 py-3.5 rounded-2xl font-black shadow-lg transition-all uppercase tracking-tight text-sm ${playabilityStatus.canPlay ? 'bg-purple-600 text-white shadow-purple-200 hover:bg-purple-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
                    >
                        出牌
                    </button>
                </>
            )}
        </div>
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
            isValidSelection={playabilityStatus.canPlay}
        />
      </div>
    </div>
  );
};

export default GameTable;
