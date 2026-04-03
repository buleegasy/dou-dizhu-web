import { GameState, initGameState, dealCards, setLandlord, playCards, passTurn } from './logic/gameController.js';

export interface Env {
  ROOM_REGISTRY: DurableObjectNamespace;
  GAME_ROOM: DurableObjectNamespace;
}

// --- Worker Entry ---
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 大厅房间列表
    if (path === '/api/rooms') {
      const id = env.ROOM_REGISTRY.idFromName('global-registry');
      const obj = env.ROOM_REGISTRY.get(id);
      return obj.fetch(request);
    }

    // 进入具体房间 (WebSocket)
    if (path.startsWith('/api/room/')) {
      const roomId = path.split('/')[3];
      const id = env.GAME_ROOM.idFromName(roomId);
      const obj = env.GAME_ROOM.get(id);

      // 注册房间到大厅
      const registryId = env.ROOM_REGISTRY.idFromName('global-registry');
      const registryObj = env.ROOM_REGISTRY.get(registryId);
      await registryObj.fetch(new Request(`http://x/add?id=${roomId}`));

      return obj.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// --- Room Registry Durable Object ---
export class RoomRegistry {
  state: DurableObjectState;
  activeRooms: Set<string> = new Set();
  
  constructor(state: DurableObjectState) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
        const stored = await this.state.storage.get<string[]>('activeRooms');
        this.activeRooms = new Set(stored || []);
    });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/rooms') {
      return new Response(JSON.stringify(Array.from(this.activeRooms)), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    if (url.pathname === '/add') {
      const id = url.searchParams.get('id');
      if (id) {
        this.activeRooms.add(id);
        await this.state.storage.put('activeRooms', Array.from(this.activeRooms));
      }
      return new Response('OK');
    }
    return new Response('Not Found', { status: 404 });
  }
}

// --- Game Room Durable Object ---
export class GameRoom {
  state: DurableObjectState;
  gameState: GameState = initGameState();
  sessions: Set<{ ws: WebSocket; playerId: number }> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
        const stored = await this.state.storage.get<GameState>('gameState');
        if (stored) this.gameState = stored;
    });
  }

  async fetch(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const playerId = this.sessions.size; // 简单分配：0, 1, 2
    
    await this.handleSession(server, playerId);

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(ws: WebSocket, playerId: number) {
    ws.accept();
    const session = { ws, playerId };
    this.sessions.add(session);

    // 发送初始状态
    ws.send(JSON.stringify({ type: 'init', playerId, state: this.gameState }));

    ws.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handleAction(data, playerId);
      } catch (e) {
        console.error('Action error:', e);
      }
    });

    ws.addEventListener('close', () => {
      this.sessions.delete(session);
    });
  }

  async handleAction(action: any, playerId: number) {
    // 这里执行 gameController 的逻辑
    let newState = this.gameState;
    
    switch (action.type) {
      case 'deal':
        newState = dealCards(this.gameState);
        break;
      case 'landlord':
        newState = setLandlord(this.gameState, action.index);
        break;
      case 'play':
        const result = playCards(this.gameState, playerId, action.cards);
        if (!result.error) newState = result.state;
        break;
      case 'pass':
        const passResult = passTurn(this.gameState, playerId);
        if (!passResult.error) newState = passResult.state;
        break;
    }

    this.gameState = newState;
    await this.state.storage.put('gameState', this.gameState);
    this.broadcastState();
  }

  broadcastState() {
    const payload = JSON.stringify({ type: 'update', state: this.gameState });
    for (const session of this.sessions) {
      session.ws.send(payload);
    }
  }
}
