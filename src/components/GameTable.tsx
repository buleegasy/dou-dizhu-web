import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Info, Users, CheckCircle2, AlertCircle, Bot, UserPlus, Clock, ArrowRight, Sparkles } from 'lucide-react';
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
  autoStart?: boolean;
}

const GameTable: React.FC<GameTableProps> = ({ roomId, onExit, aiCount = 0, autoStart = false }) => {
  const [state, setState] = useState<GameState>(initGameState());
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(25);
  
  const syncRef = useRef<GameSync | null>(null);
  const autoStartedRef = useRef(false);

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

  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    if (playerId === null) return;
    if (state.stage !== GameStage.Idle) {
      autoStartedRef.current = true;
      return;
    }

    autoStartedRef.current = true;
    handleStart();
  }, [autoStart, playerId, state.stage, aiCount]);

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
  const lastHandKey = state.lastHand?.cards.map(card => card.id).join('-') ?? 'empty';
  const seatOrder = playerId !== null
    ? [playerId, (playerId + 1) % 3, (playerId + 2) % 3]
    : [0, 1, 2];

  const getSeatName = (seat: number) => {
    if (playerId === null) return `玩家 ${seat + 1}`;
    if (seat === playerId) return '你';
    if (seat === (playerId + 1) % 3) return '左侧';
    if (seat === (playerId + 2) % 3) return '右侧';
    return `玩家 ${seat + 1}`;
  };

  const currentTurnLabel = getSeatName(state.turnIndex);
  const nextTurnLabel = getSeatName((state.turnIndex + 1) % 3);
  const lastActorLabel = state.lastHand ? getSeatName(state.lastHand.playerIndex) : null;
  const deskHint = useMemo(() => {
    if (state.stage === GameStage.Idle) return '点击开始游戏后发牌';
    if (state.stage === GameStage.Bidding) {
      return isMyTurn ? '现在轮到你决定是否叫地主' : `现在轮到${currentTurnLabel}叫地主`;
    }
    if (state.stage === GameStage.Playing) {
      if (!state.lastHand || state.passCount >= 2) {
        return isMyTurn ? '你是本轮首出，请先出牌' : `${currentTurnLabel}是本轮首出`;
      }
      return isMyTurn
        ? `你需要压过${lastActorLabel}的${state.lastHand.handDetail.type}`
        : `现在轮到${currentTurnLabel}决定是否接${lastActorLabel}的牌`;
    }
    return '本局已结束';
  }, [state.stage, state.lastHand, state.passCount, isMyTurn, currentTurnLabel, lastActorLabel]);

  const turnChips = useMemo(
    () =>
      seatOrder.map((seat, index) => ({
        seat,
        name: getSeatName(seat),
        role: index === 0 ? '当前视角' : index === 1 ? '上家' : '下家',
        isTurn: state.turnIndex === seat,
        isLast: state.lastHand?.playerIndex === seat,
      })),
    [seatOrder, state.turnIndex, state.lastHand, playerId],
  );

  // 辅助渲染：头像与倒计时
  const renderPlayerAvatar = (pIndex: number, label: string, isLeft: boolean = false) => {
      const p = state.players[pIndex];
      const isTurn = state.turnIndex === pIndex;
      const isBiddingOrPlaying = state.stage === GameStage.Bidding || state.stage === GameStage.Playing;
      
      return (
        <motion.div
          layout
          animate={{
            y: isTurn && isBiddingOrPlaying ? -3 : 0,
            scale: isTurn && isBiddingOrPlaying ? 1.015 : 1,
          }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`p-4 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center space-x-4 ${!isLeft ? 'justify-end' : ''}`}
        >
          <div className="relative">
              <motion.div
                animate={isTurn && isBiddingOrPlaying ? { scale: 1.08 } : { scale: 1 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${p?.isAi ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-400'} ${isTurn && isBiddingOrPlaying ? 'ring-4 ring-purple-400 shadow-lg' : ''}`}
              >
                {p?.isAi ? <Bot size={24} /> : <Users size={20} />}
              </motion.div>
              {isTurn && isBiddingOrPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md"
                  >
                      {timeLeft}
                  </motion.div>
              )}
          </div>
          <div className={`flex-1 flex justify-between items-center ${!isLeft ? 'flex-row-reverse text-right' : ''}`}>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight flex items-center">
                    {p?.isAi ? `AI 托管 (${label})` : `玩家 ${pIndex + 1} (${label})`}
                </div>
                <div className="text-xl font-black text-gray-900">
                    {p?.cards.length || 0} <span className="text-xs font-medium text-gray-400">Cards</span>
                </div>
                <div className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${isTurn && isBiddingOrPlaying ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                  {isTurn && isBiddingOrPlaying ? '当前操作中' : '等待中'}
                </div>
              </div>
              {!p?.isAi && state.stage === GameStage.Idle && (
                  <button onClick={() => handleAddAi(pIndex)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-xl transition-colors">
                      <UserPlus size={18} />
                  </button>
              )}
          </div>
        </motion.div>
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
            {state.stage === GameStage.Idle && !autoStart && (
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

      <div className="mb-5 grid gap-3 lg:grid-cols-[1.2fr_1.8fr]">
        <div className="rounded-3xl border border-purple-100 bg-white px-5 py-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-purple-500">
            <Sparkles size={12} />
            出牌顺序
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {turnChips.map((chip, index) => (
              <React.Fragment key={chip.seat}>
                <motion.div
                  layout
                  animate={{
                    y: chip.isTurn ? -3 : 0,
                    scale: chip.isTurn ? 1.03 : 1,
                  }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className={`rounded-2xl border px-3 py-2 ${chip.isTurn ? 'border-purple-300 bg-purple-50 text-purple-700 shadow-sm shadow-purple-100' : chip.isLast ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{chip.role}</div>
                  <div className="text-sm font-black">{chip.name}</div>
                </motion.div>
                {index < turnChips.length - 1 && <ArrowRight size={14} className="text-gray-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">当前提示</div>
          <div className="text-lg font-black text-gray-900">{deskHint}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1">上一手：{lastActorLabel ?? '暂无'}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">当前应出：{currentTurnLabel}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">下一位：{nextTurnLabel}</span>
          </div>
        </div>
      </div>

      {/* 出牌区域 */}
      <div className="flex-1 flex flex-col items-center justify-center border-y border-dashed border-gray-200 my-4 relative rounded-3xl bg-white/35">
        {state.lastHand && (
            <div className="flex flex-col items-center">
                <div className="flex items-center text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-4 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                    <Info size={10} className="mr-1.5" />
                    {lastActorLabel} 刚刚出了 {state.lastHand.handDetail.type}
                </div>
                <motion.div
                  key={lastHandKey}
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex space-x-[-20px]"
                >
                    <AnimatePresence mode="popLayout">
                        {state.lastHand.cards.map((c, index) => (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 24, rotate: index % 2 === 0 ? -4 : 4, scale: 0.88 }}
                            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.92 }}
                            transition={{ duration: 0.28, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
                            className="origin-bottom"
                          >
                            <Card card={c} isSmall={true} className="play-card-glow" />
                          </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        )}
        {!state.lastHand && (
          <div className="flex flex-col items-center text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">牌桌中央</div>
            <div className="mt-2 text-xl font-black text-gray-700">{deskHint}</div>
          </div>
        )}

        {state.passCount > 0 && (
          <div className="absolute bottom-5 rounded-full bg-gray-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
            已连续过牌 {state.passCount} 次
          </div>
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
            <motion.div
              key={`${state.turnIndex}-${state.stage}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={`rounded-full px-4 py-2 text-xs font-black tracking-wide ${isMyTurn ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {isMyTurn ? '现在轮到你操作' : `现在轮到${currentTurnLabel}操作`}
            </motion.div>
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
                <motion.div
                  animate={timeLeft <= 5 ? { scale: [1, 1.03, 1], opacity: [0.94, 1, 0.94] } : { scale: 1, opacity: 1 }}
                  transition={timeLeft <= 5 ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-black italic tracking-tighter ${timeLeft <= 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}
                >
                    <Clock size={12} />
                    <span>00:{timeLeft.toString().padStart(2, '0')}</span>
                </motion.div>
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
      <div className="w-full max-w-5xl mx-auto bg-white/80 backdrop-blur-sm rounded-t-[40px] border-x border-t border-gray-100 px-6 hand-stage-sheen">
        <div className="flex items-center justify-between border-b border-gray-100 px-2 pt-4 text-xs font-bold text-gray-500">
          <span>你的手牌区</span>
          <span>{isMyTurn ? '请先选牌，再点击出牌' : `等待${currentTurnLabel}出牌`}</span>
        </div>
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
