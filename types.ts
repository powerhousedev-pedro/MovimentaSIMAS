
export interface UserProfile {
  matricula: string;
  name: string;
  currentPosition: string;
  location: string;
  bairro: string;
  bio: string; // Mantido para compatibilidade, mas será substituído na UI
  imageUrl: string;
  disponivelParaTroca: boolean;
  email: string;
  cargo: string;
  areaDeInteresse: string; // Armazenado como string separada por vírgulas
  isLocked: boolean; // Flag para indicar se o perfil está em uma troca pendente
}

export type SwipeDirection = 'left' | 'right';

export type View = 'swiping' | 'matches' | 'profile' | 'history' | 'chat' | 'manager';

export interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  isManager: boolean;
  login: (matricula: string, password:string) => Promise<void>;
  logout: () => void;
  setPassword: (newPassword: string) => Promise<void>;
  // Fix: Changed return type to Promise<UserProfile> to match the actual implementation and fix type errors.
  updateUserProfile: (profile: UserProfile) => Promise<UserProfile>;
  uploadProfilePicture: (file: File) => Promise<void>;
}

export interface Message {
  timestamp: string;
  chatId: string;
  sender: string; // matricula
  text: string;
}

export interface SwapStatus {
  user1: string;
  user1_confirmed: boolean;
  user2: string;
  user2_confirmed: boolean;
  status: 'pending' | 'confirmed' | 'completed' | 'rejected';
}

export interface LocationData {
  lotacao: string;
  vinculacao: string;
  bairro: string;
}

export interface ConfirmedSwap {
    id: string; // Combinação de matrículas
    user1: UserProfile;
    user2: UserProfile;
}