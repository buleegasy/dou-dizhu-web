import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Suit } from '../logic/cardUtils';
import type { Card as CardType } from '../logic/cardUtils';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isValidSelection?: boolean;
  onClick?: () => void;
  isSmall?: boolean;
  className?: string;
  tilt?: number;
}

const CardComponent: React.FC<CardProps> = ({ card, isSelected, isValidSelection, onClick, isSmall, className, tilt = 0 }) => {
  const isRed = card.suit === Suit.Heart || card.suit === Suit.Diamond || card.rank === 'RJ';
  const displayRank = card.rank === 'BJ' ? '小王' : card.rank === 'RJ' ? '大王' : card.rank;
  const interactive = Boolean(onClick);

  const getBorderColor = () => {
    if (!isSelected) return 'border-gray-200';
    if (isValidSelection === undefined) return 'border-purple-500 ring-purple-100';
    return isValidSelection ? 'border-green-500 ring-green-100' : 'border-red-400 ring-red-100';
  };

  const transform = `translateY(${isSelected ? '-34px' : '0px'}) rotate(${isSmall ? 0 : tilt}deg)`;

  return (
    <motion.div
      onClick={onClick}
      style={{ transform }}
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.92 }}
      whileHover={interactive ? { y: isSelected ? -38 : -10, scale: 1.012 } : undefined}
      whileTap={interactive ? { scale: 0.988 } : undefined}
      transition={{
        duration: 0.24,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`
        relative select-none
        bg-white border rounded-xl shadow-sm
        flex flex-col items-center justify-between
        origin-bottom will-change-transform
        ${isSmall ? 'w-10 h-14 p-1 text-[10px]' : 'w-24 h-32 p-3 text-xl'}
        ${isRed ? 'text-red-600' : 'text-gray-900'}
        ${interactive ? 'cursor-pointer' : 'cursor-default'}
        ${isSelected ? `ring-4 shadow-xl z-20 ${getBorderColor()}` : 'border-gray-200'}
        ${interactive ? 'hover:-translate-y-2 hover:border-purple-300 active:scale-[0.98]' : ''}
        transition-[transform,border-color,box-shadow] duration-180 ease-out
        ${className}
      `}
    >
      {!isSmall && (
        <div className={`absolute inset-x-2 top-1.5 h-4 rounded-full blur-md transition-opacity duration-200 ${isSelected ? 'opacity-70 bg-purple-200/70' : 'opacity-0 bg-transparent'}`} />
      )}

      <div className={`absolute top-1.5 left-1.5 leading-none font-black ${isSmall ? 'text-[10px]' : 'text-lg'}`}>
        {displayRank}
      </div>

      <div className={`${isSmall ? 'text-lg' : 'text-5xl'} self-center opacity-90`}>
        {card.suit}
      </div>

      <div className={`absolute bottom-1.5 right-1.5 leading-none font-black rotate-180 ${isSmall ? 'text-[10px]' : 'text-lg'}`}>
        {displayRank}
      </div>

      {isSelected && isValidSelection !== undefined && (
        <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md ${isValidSelection ? 'bg-green-500' : 'bg-red-500'}`}>
          <div className="w-2 h-2 bg-white rounded-full card-status-ping" />
        </div>
      )}
    </motion.div>
  );
};

const Card = memo(CardComponent);

export default Card;
