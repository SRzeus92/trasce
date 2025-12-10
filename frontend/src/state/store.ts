export type Friend = { id: number; username: string; avatar: string; online: boolean };
export type FriendRequest = { id: number; username: string; avatar: string; sent: boolean };
export type GameItem = { id: number; opponent: string; result: 'Vittoria' | 'Sconfitta'; score: string; date: string };

export type AppState = {
  isLoggedIn: boolean;
  currentUser: string;
  userAvatar: string;
  userEmail: string;
  friends: Friend[];
  friendRequests: FriendRequest[];
  gameHistory: GameItem[];
  gameConfig?: { lockedMode?: 'pvp' | 'ai'; onGameEnd?: null | ((winner: 'left'|'right', leftScore: number, rightScore: number) => void) };
  tournament?: {
    players: { name: string; isAI: boolean }[]; // length 4
    round: 'semifinals' | 'final' | 'done';
    semifinalWinners: (null | { name: string; isAI: boolean })[]; // length 2
  };
};

const defaultAvatar = '/default-avatar.png';

class Store {
  private state: AppState = {
    isLoggedIn: false,
    currentUser: '',
    userAvatar: defaultAvatar,
    userEmail: '',
    friends: [],
    friendRequests: [],
    gameHistory: [],
    gameConfig: undefined,
    tournament: undefined,
  };

  getState(): AppState {
    return this.state;
  }

  setState(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial };
  }

  loadMockData() {
    this.state.friends = [
      { id: 1, username: 'player1', avatar: defaultAvatar, online: true },
      { id: 2, username: 'gamer42', avatar: defaultAvatar, online: false },
      { id: 3, username: 'pongMaster', avatar: defaultAvatar, online: true },
    ];

    this.state.friendRequests = [
      { id: 4, username: 'newPlayer', avatar: defaultAvatar, sent: false },
      { id: 5, username: 'proGamer', avatar: defaultAvatar, sent: true },
    ];

    this.state.gameHistory = [
      { id: 1, opponent: 'player1', result: 'Vittoria', score: '10-5', date: '2024-01-15' },
      { id: 2, opponent: 'gamer42', result: 'Sconfitta', score: '7-10', date: '2024-01-14' },
      { id: 3, opponent: 'pongMaster', result: 'Vittoria', score: '10-8', date: '2024-01-13' },
    ];
  }
}

export const store = new Store();

