import GameTable from './components/GameTable'
import Lobby from './components/Lobby'
import ModeSelect, { type GameMode } from './components/ModeSelect'
import './index.css'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

type Screen = 'lobby' | 'modeSelect' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [aiCount, setAiCount] = useState<number>(0);

  const handleJoin = (id: string) => {
    setCurrentRoomId(id);
    setScreen('modeSelect');
  };

  const handleConfirmMode = (mode: GameMode) => {
    const counts: Record<GameMode, number> = {
      '1v2ai': 2,
      '2v1ai': 1,
      '3human': 0,
    };
    setAiCount(counts[mode]);
    setScreen('game');
  };

  const handleLeave = () => {
    setCurrentRoomId(null);
    setAiCount(0);
    setScreen('lobby');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-hidden font-sans antialiased text-gray-900 selection:bg-purple-100">
      <AnimatePresence mode="wait">
        {screen === 'lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 flex flex-col"
          >
            <Lobby onJoinRoom={handleJoin} />
          </motion.div>
        )}

        {screen === 'modeSelect' && currentRoomId && (
          <motion.div
            key="modeSelect"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 flex flex-col"
          >
            <ModeSelect
              roomId={currentRoomId}
              onConfirm={handleConfirmMode}
              onBack={handleLeave}
            />
          </motion.div>
        )}

        {screen === 'game' && currentRoomId && (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: 'circOut' }}
            className="flex-1 flex flex-col"
          >
            <GameTable onExit={handleLeave} roomId={currentRoomId} aiCount={aiCount} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
