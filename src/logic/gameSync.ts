import { GameState } from './gameController';

export type SyncMessage = 
  | { type: 'init'; playerId: number; state: GameState }
  | { type: 'update'; state: GameState }
  | { type: 'error'; message: string };

export class GameSync {
  private ws: WebSocket | null = null;
  private onStateUpdate: (state: GameState, playerId?: number) => void;
  private onError: (msg: string) => void;
  private baseUrl: string = 'wss://dou-dizhu-backend.buleegasy-6c8.workers.dev';

  constructor(
    onStateUpdate: (state: GameState, playerId?: number) => void,
    onError: (msg: string) => void
  ) {
    this.onStateUpdate = onStateUpdate;
    this.onError = onError;
  }

  connect(roomId: string) {
    if (this.ws) this.ws.close();

    const wsUrl = `${this.baseUrl}/api/room/${roomId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data: SyncMessage = JSON.parse(event.data);
        if (data.type === 'init') {
          this.onStateUpdate(data.state, data.playerId);
        } else if (data.type === 'update') {
          this.onStateUpdate(data.state);
        } else if (data.type === 'error') {
          this.onError(data.message);
        }
      } catch (e) {
        console.error('Failed to parse sync message:', e);
      }
    };

    this.ws.onerror = () => {
      this.onError('连接服务器失败');
    };

    this.ws.onclose = () => {
      console.log('Sync connection closed');
    };
  }

  sendAction(action: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
