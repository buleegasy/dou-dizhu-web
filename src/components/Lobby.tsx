import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Play, Hash, RefreshCcw, History, Search, ArrowRight } from 'lucide-react';

interface LobbyProps {
  onJoinRoom: (roomId: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onJoinRoom }) => {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [replayIdInput, setReplayIdInput] = useState('');
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://dou-dizhu-backend.buleegasy-6c8.workers.dev/api/rooms');
      const data = await response.json();
      setActiveRooms(data);
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const timer = setInterval(fetchRooms, 5000); // 每 5 秒刷新一次
    return () => clearInterval(timer);
  }, []);

  const handleJoin = (id: string) => {
    if (id.trim()) {
      onJoinRoom(id.trim().toUpperCase());
    }
  };

  const handleReplay = async (id: string) => {
    if (!id.trim()) return;
    const url = `https://dou-dizhu-backend.buleegasy-6c8.workers.dev/api/room/${id.trim().toUpperCase()}/replay`;
    window.open(url, '_blank'); // 暂时直接打开 JSON，后续可以做 UI
  };

  const createRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-3 rounded-2xl">
              <Play className="text-purple-600 fill-purple-600" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">斗地主大厅</h1>
          </div>
          <button 
            onClick={fetchRooms}
            className={`p-2 text-gray-400 hover:text-purple-600 transition-colors ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        <motion.button
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleJoin(createRoomId())}
          className="group mb-8 w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-purple-600 via-purple-500 to-fuchsia-500 p-6 text-left text-white shadow-xl shadow-purple-200"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/90">
                最常用操作
              </div>
              <div className="text-3xl font-black tracking-tight">新建房间</div>
              <div className="mt-2 max-w-xs text-sm font-medium text-white/85">
                一键创建新房间，下一步直接选择模式并自动开局。
              </div>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-white transition-transform duration-200 group-hover:translate-x-1">
              <Plus size={26} />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <div className="rounded-full bg-white/14 px-3 py-1.5 text-xs font-bold text-white/90">
              推荐从这里开始
            </div>
            <div className="flex items-center gap-1 text-sm font-black">
              立即创建
              <ArrowRight size={16} />
            </div>
          </div>
        </motion.button>

        {/* 手动输入房间号 */}
        <div className="mb-10">
          <label className="block text-sm font-medium text-gray-400 mb-3 ml-1">已有房间？输入房间号加入</label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text" 
                placeholder="输入房间 ID"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin(roomIdInput)}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-200 transition-all text-gray-700 font-medium placeholder:text-gray-300 uppercase"
              />
            </div>
            <button 
              onClick={() => handleJoin(roomIdInput)}
              disabled={!roomIdInput.trim()}
              className="px-6 py-3.5 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 disabled:opacity-50 active:scale-95 transition-all"
            >
              加入
            </button>
          </div>
        </div>

        {/* 回放查询 */}
        <div className="mb-10 p-4 bg-gray-50 rounded-3xl border border-gray-100">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1 flex items-center">
              <History size={12} className="mr-1" />
              查询对局回放 (Beta)
          </label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input 
                type="text" 
                placeholder="输入历史房间 ID"
                value={replayIdInput}
                onChange={(e) => setReplayIdInput(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border-transparent rounded-xl focus:ring-2 focus:ring-purple-200 transition-all text-xs font-bold text-gray-600 placeholder:text-gray-200 uppercase"
              />
            </div>
            <button 
              onClick={() => handleReplay(replayIdInput)}
              className="px-4 py-2.5 bg-white text-purple-600 border border-gray-100 rounded-xl font-bold shadow-sm hover:bg-purple-50 transition-all text-xs"
            >
              回放
            </button>
          </div>
        </div>

        {/* 活跃房间列表 */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center">
              <Users size={16} className="mr-2 text-purple-500" />
              活跃房间 ({activeRooms.length})
            </h2>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
              快速加入
            </div>
          </div>

          <div className="grid gap-3 max-h-64 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {activeRooms.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100"
                >
                  <p className="text-sm text-gray-400">当前没有活跃房间</p>
                </motion.div>
              ) : (
                activeRooms.map((id) => (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleJoin(id)}
                    className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-purple-50 rounded-2xl border border-transparent hover:border-purple-100 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 group-hover:text-purple-500 shadow-sm font-mono font-bold text-xs uppercase transition-colors">
                        {id.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-700 group-hover:text-purple-700 font-mono uppercase tracking-wider">{id}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-tighter">Active Room</div>
                      </div>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={14} className="text-purple-600 fill-purple-600" />
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 text-[10px] text-gray-300 uppercase tracking-widest font-medium">
        Multplayer Engine Powered by Cloudflare Durable Objects
      </div>
    </div>
  );
};

export default Lobby;
