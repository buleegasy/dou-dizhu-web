import React, { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card from './Card';
import type { Card as CardType } from '../logic/cardUtils';

interface HandProps {
  cards: CardType[];
  selectedIndices?: number[];
  onToggleCard?: (index: number) => void;
  isSmall?: boolean;
  isValidSelection?: boolean;
}

const HandComponent: React.FC<HandProps> = ({ cards, selectedIndices = [], onToggleCard, isSmall, isValidSelection }) => {
  const center = (cards.length - 1) / 2;

  return (
    <div className="flex flex-row justify-center items-end -space-x-8 md:-space-x-12 px-4 py-8 [perspective:1200px]">
      <AnimatePresence initial={false}>
      {cards.map((card, index) => {
        const isSelected = selectedIndices.includes(index);
        const tilt = isSmall ? 0 : Math.max(-6, Math.min(6, (index - center) * 1.15));

        return (
          <motion.div
            key={card.id}
            className="origin-bottom"
            style={{ zIndex: isSelected ? 40 : 10 + index }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{
              duration: 0.26,
              delay: Math.min(index * 0.016, 0.14),
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Card
              card={card}
              tilt={tilt}
              isSelected={isSelected}
              isValidSelection={isSelected ? isValidSelection : undefined}
              onClick={() => onToggleCard && onToggleCard(index)}
              isSmall={isSmall}
            />
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
};

const Hand = memo(HandComponent);

export default Hand;
