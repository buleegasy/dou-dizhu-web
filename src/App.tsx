import GameTable from './components/GameTable'
import Lobby from './components/Lobby'
import './index.css'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

function App() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  
  // 模拟活跃房间列表已改为直接从后端获取

  const handleJoin = (id: string) => {
    setCurrentRoomId(id);
  };

  const handleLeave = () => {
    setCurrentRoomId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-hidden font-sans antialiased text-gray-900 selection:bg-purple-100">
      <AnimatePresence mode="wait">
        {!currentRoomId ? (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 flex flex-col"
          >
            <Lobby onJoinRoom={handleJoin} />
          </motion.div>
        ) : (
          <motion.div 
            key="game"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "circOut" }}
            className="flex-1 flex flex-col"
          >
            <GameTable onExit={handleLeave} roomId={currentRoomId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
