import React from 'react';
import Card from './Card';
import type { Card as CardType } from '../logic/cardUtils';

interface HandProps {
  cards: CardType[];
  selectedIndices?: number[];
  onToggleCard?: (index: number) => void;
  isSmall?: boolean;
}

import { AnimatePresence } from 'framer-motion';

const Hand: React.FC<HandProps> = ({ cards, selectedIndices = [], onToggleCard, isSmall }) => {
  return (
    <div className="flex flex-row justify-center items-end -space-x-8 md:-space-x-12 px-4 py-8">
      <AnimatePresence>
        {cards.map((card, index) => {
          const isSelected = selectedIndices.includes(index);
          return (
            <Card
              key={card.id}
              card={card}
              isSelected={isSelected}
              onClick={() => onToggleCard && onToggleCard(index)}
              isSmall={isSmall}
              className="hover:z-10 transition-transform"
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default Hand;
