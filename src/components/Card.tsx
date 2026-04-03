import React from 'react';
import { motion } from 'framer-motion';
import { Suit } from '../logic/cardUtils';
import type { Card as CardType } from '../logic/cardUtils';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  onClick?: () => void;
  isSmall?: boolean;
  className?: string;
}

const Card: React.FC<CardProps> = ({ card, isSelected, onClick, isSmall, className }) => {
  const isRed = card.suit === Suit.Heart || card.suit === Suit.Diamond || card.rank === 'RJ';
  const displayRank = card.rank === 'BJ' ? '小王' : card.rank === 'RJ' ? '大王' : card.rank;
  
  return (
    <motion.div
      layoutId={card.id}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: isSelected ? -24 : 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`
        relative select-none cursor-pointer
        bg-white border rounded-lg shadow-sm
        flex flex-col items-center justify-between
        ${isSmall ? 'w-10 h-14 p-1 text-xs' : 'w-20 h-28 p-2 text-xl'}
        ${isRed ? 'text-red-600 border-red-200' : 'text-gray-900 border-gray-200'}
        ${isSelected ? 'border-purple-500 ring-2 ring-purple-100 shadow-lg' : ''}
        ${className}
      `}
    >
      {/* Top Left */}
      <div className="absolute top-1 left-1 leading-none font-bold">
        {displayRank}
      </div>
      
      {/* Center Suit */}
      <div className={`${isSmall ? 'text-lg' : 'text-4xl'} self-center`}>
        {card.suit}
      </div>
      
      {/* Bottom Right */}
      <div className="absolute bottom-1 right-1 leading-none font-bold rotate-180">
        {displayRank}
      </div>
    </motion.div>
  );
};

export default Card;
