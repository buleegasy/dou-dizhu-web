import React from 'react';
import { motion } from 'framer-motion';
import { Suit } from '../logic/cardUtils';
import type { Card as CardType } from '../logic/cardUtils';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isValidSelection?: boolean; // 新增属性，用于表示当前选择是否合法
  onClick?: () => void;
  isSmall?: boolean;
  className?: string;
}

const Card: React.FC<CardProps> = ({ card, isSelected, isValidSelection, onClick, isSmall, className }) => {
  const isRed = card.suit === Suit.Heart || card.suit === Suit.Diamond || card.rank === 'RJ';
  const displayRank = card.rank === 'BJ' ? '小王' : card.rank === 'RJ' ? '大王' : card.rank;
  
  // 根据合法性决定选中时的边框颜色
  const getBorderColor = () => {
    if (!isSelected) return 'border-gray-200';
    if (isValidSelection === undefined) return 'border-purple-500 ring-purple-100'; // 基础选中色
    return isValidSelection 
        ? 'border-green-500 ring-green-100 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
        : 'border-red-400 ring-red-100';
  };

  return (
    <motion.div
      layoutId={card.id}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: isSelected ? -28 : 0,
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        relative select-none cursor-pointer
        bg-white border rounded-xl shadow-sm
        flex flex-col items-center justify-between
        ${isSmall ? 'w-10 h-14 p-1 text-[10px]' : 'w-24 h-32 p-3 text-xl'}
        ${isRed ? 'text-red-600' : 'text-gray-900'}
        ${isSelected ? `ring-4 shadow-xl z-10 ${getBorderColor()}` : 'border-gray-200 hover:border-purple-300'}
        transition-colors duration-200
        ${className}
      `}
    >
      {/* Top Left */}
      <div className={`absolute top-1.5 left-1.5 leading-none font-black ${isSmall ? 'text-[10px]' : 'text-lg'}`}>
        {displayRank}
      </div>
      
      {/* Center Suit */}
      <div className={`${isSmall ? 'text-lg' : 'text-5xl'} self-center opacity-90`}>
        {card.suit}
      </div>
      
      {/* Bottom Right */}
      <div className={`absolute bottom-1.5 right-1.5 leading-none font-black rotate-180 ${isSmall ? 'text-[10px]' : 'text-lg'}`}>
        {displayRank}
      </div>

      {/* 合法性指示小点 (可选) */}
      {isSelected && isValidSelection !== undefined && (
          <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md ${isValidSelection ? 'bg-green-500' : 'bg-red-500'}`}>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
      )}
    </motion.div>
  );
};

export default Card;
