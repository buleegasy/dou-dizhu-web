import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Users, UserCheck, ArrowLeft } from 'lucide-react';

export type GameMode = '1v2ai' | '2v1ai' | '3human';

interface ModeSelectProps {
  roomId: string;
  onConfirm: (mode: GameMode) => void;
  onBack: () => void;
}

const modes = [
  {
    id: '1v2ai' as GameMode,
    label: '单机模式',
    subLabel: '你 vs 2 AI',
    desc: '适合独自练习。两名对手将由服务器托管 AI 扮演，无需等待。',
    icon: <Bot size={28} />,
    iconBg: 'bg-purple-100 text-purple-600',
    tag: '推荐',
    tagColor: 'bg-purple-600',
  },
  {
    id: '2v1ai' as GameMode,
    label: '双人模式',
    subLabel: '2 真人 + 1 AI',
    desc: '邀请一位朋友，让 AI 补位，三人局立刻开打。',
    icon: <UserCheck size={28} />,
    iconBg: 'bg-blue-100 text-blue-600',
    tag: null,
    tagColor: '',
  },
  {
    id: '3human' as GameMode,
    label: '联机模式',
    subLabel: '3 真人对战',
    desc: '等待三名真实玩家加入同一房间，享受完整的人机博弈体验。',
    icon: <Users size={28} />,
    iconBg: 'bg-green-100 text-green-600',
    tag: null,
    tagColor: '',
  },
];

const ModeSelect: React.FC<ModeSelectProps> = ({ roomId, onConfirm, onBack }) => {
  const [selected, setSelected] = useState<GameMode>('1v2ai');

  const handleChooseMode = (mode: GameMode) => {
    setSelected(mode);
    onConfirm(mode);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={onBack}
            className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors text-gray-400"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">选择游戏模式</h1>
            <div className="text-[10px] font-mono font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full w-fit mt-0.5 uppercase tracking-wider">
              ROOM {roomId}
            </div>
          </div>
        </div>

        {/* Mode cards */}
        <div className="space-y-3 mb-8">
          <AnimatePresence>
            {modes.map((mode, i) => (
              <motion.button
                key={mode.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleChooseMode(mode.id)}
                className={`w-full text-left p-5 rounded-3xl border-2 transition-all duration-200 flex items-start space-x-4 ${
                  selected === mode.id
                    ? 'bg-white border-purple-400 shadow-lg shadow-purple-100'
                    : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                }`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${mode.iconBg}`}>
                  {mode.icon}
                </div>

                {/* Text */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-base font-bold text-gray-900">{mode.label}</span>
                    {mode.tag && (
                      <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-wide ${mode.tagColor}`}>
                        {mode.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-purple-500 mb-1.5">{mode.subLabel}</div>
                  <p className="text-xs text-gray-400 leading-relaxed">{mode.desc}</p>
                </div>

                {/* Selection indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                  selected === mode.id ? 'border-purple-500 bg-purple-500' : 'border-gray-200'
                }`}>
                  {selected === mode.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <div className="text-center text-xs font-semibold text-gray-400">
          点击任一模式卡片后将直接进入房间并自动开局
        </div>
      </motion.div>
    </div>
  );
};

export default ModeSelect;
