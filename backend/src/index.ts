import { GameState, initGameState, dealCards, setLandlord, playCards, passTurn, passBid, GameStage } from './logic/gameController.js';
import { decidePlay, decideBid, evaluateHandPower } from './logic/aiController.js';

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

    // 进入具体房间
    if (path.startsWith('/api/room/')) {
      const parts = path.split('/');
      const roomId = parts[3];
      const subAction = parts[4]; // 'replay'

      const id = env.GAME_ROOM.idFromName(roomId);
      const obj = env.GAME_ROOM.get(id);

      if (subAction === 'replay') {
          return obj.fetch(request);
      }

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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
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
  
  readonly TIMEOUT_MS = 25000;
  readonly CLEANUP_MS = 1000 * 60 * 5;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
        const stored = await this.state.storage.get<GameState>('gameState');
        if (stored) this.gameState = stored;
    });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/replay')) {
        return new Response(JSON.stringify(this.gameState.history || []), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    
    const occupiedIds = Array.from(this.sessions).map(s => s.playerId);
    let playerId = 0;
    while (occupiedIds.includes(playerId)) playerId++;
    if (playerId >= 3) return new Response('Room Full', { status: 403 });

    await this.handleSession(server, playerId);

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(ws: WebSocket, playerId: number) {
    ws.accept();
    const session = { ws, playerId };
    this.sessions.add(session);

    ws.send(JSON.stringify({ type: 'init', playerId, state: this.gameState }));

    ws.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleAction(data, playerId);
      } catch (e) {
        console.error('Action error:', e);
      }
    });

    ws.addEventListener('close', async () => {
      this.sessions.delete(session);
      if (this.sessions.size === 0) {
          await this.state.storage.setAlarm(Date.now() + this.CLEANUP_MS);
      }
    });
  }

  async handleAction(action: any, playerId: number) {
    let newState = { ...this.gameState };
    
    if (!newState.history) newState.history = [];
    newState.history.push({ ...action, playerId, timestamp: Date.now() });

    switch (action.type) {
      case 'deal':
        newState = dealCards(newState);
        break;
      case 'add_ai':
        const seat = action.index;
        const newPlayers = [...newState.players];
        newPlayers[seat] = { ...newPlayers[seat], isAi: true };
        newState = { ...newState, players: newPlayers };
        break;
      case 'landlord':
        newState = setLandlord(newState, action.index);
        break;
      case 'pass_bid':
        newState = passBid(newState, playerId);
        break;
      case 'play':
        const result = playCards(newState, playerId, action.cards);
        if (!result.error) newState = result.state;
        break;
      case 'pass':
        const passResult = passTurn(newState, playerId);
        if (!passResult.error) newState = passResult.state;
        break;
    }

    newState.lastActionTimestamp = Date.now();
    this.gameState = newState;
    await this.state.storage.put('gameState', this.gameState);
    
    this.broadcastState();

    if (this.gameState.stage === GameStage.Bidding || this.gameState.stage === GameStage.Playing) {
        await this.state.storage.setAlarm(Date.now() + this.TIMEOUT_MS);
    } else {
        if (this.sessions.size === 0) {
            await this.state.storage.setAlarm(Date.now() + this.CLEANUP_MS);
        } else {
            await this.state.storage.deleteAlarm();
        }
    }

    this.checkAndTriggerAI();
  }

  async onAlarm() {
    if (this.sessions.size === 0) {
        await this.state.storage.deleteAll();
        return;
    }

    const state = this.gameState;
    if (state.stage === GameStage.Bidding) {
        console.log(`[Alarm] Timeout Bid Pass for Seat ${state.turnIndex}`);
        await this.handleAction({ type: 'pass_bid' }, state.turnIndex);
    } else if (state.stage === GameStage.Playing) {
        console.log(`[Alarm] Timeout Auto Play for Seat ${state.turnIndex}`);
        const decision = decidePlay(state, state.turnIndex);
        await this.handleAction({ type: decision.action === 'play' ? 'play' : 'pass', cards: decision.cards }, state.turnIndex);
    }
  }

  checkAndTriggerAI() {
    const s = this.gameState;
    const currentPlayer = s.players[s.turnIndex];
    if (!currentPlayer || !currentPlayer.isAi) return;

    // AI 决策逻辑使用更加拟人化的延迟
    setTimeout(async () => {
        // 重读最新的状态并校验
        const latestState = this.gameState;
        if (latestState.turnIndex !== currentPlayer.id || (latestState.stage !== GameStage.Bidding && latestState.stage !== GameStage.Playing)) {
            return;
        }

        if (latestState.stage === GameStage.Bidding) {
            const score = evaluateHandPower(currentPlayer.cards);
            const want = decideBid(currentPlayer.cards);
            console.log(`[AI Decision] Seat ${currentPlayer.id}: ${want ? 'BID' : 'PASS'} (Score: ${score})`);
            
            if (want) {
                await this.handleAction({ type: 'landlord', index: currentPlayer.id }, currentPlayer.id);
            } else {
                await this.handleAction({ type: 'pass_bid' }, currentPlayer.id);
            }
        } else if (latestState.stage === GameStage.Playing) {
            const decision = decidePlay(latestState, currentPlayer.id);
            console.log(`[AI Decision] Seat ${currentPlayer.id}: ${decision.action.toUpperCase()} (${decision.cards?.length || 0} cards)`);
            await this.handleAction({ type: decision.action === 'play' ? 'play' : 'pass', cards: decision.cards }, currentPlayer.id);
        }
    }, 1500);
  }

  broadcastState() {
    const payload = JSON.stringify({ type: 'update', state: this.gameState });
    for (const session of this.sessions) {
      try {
          session.ws.send(payload);
      } catch (e) {}
    }
  }
}
