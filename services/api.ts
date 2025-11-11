
import { UserProfile, Message, SwapStatus, LocationData, ConfirmedSwap, SwipeDirection } from '../types';

const API_URL = 'https://script.google.com/macros/s/AKfycbxL-8cwwGL4pyrZjdbLZzGxNbQPcQZvDznKlkoFYPJafyEe_QEFdl8AEGEoyAy43XyZ/exec';

// Helper refatorado para centralizar a lógica de requisição e tratamento de erros.
const postRequest = async (payload: object) => {
  try {
    const blob = new Blob([JSON.stringify(payload)], {
      type: 'text/plain;charset=UTF-8',
    });
    const response = await fetch(API_URL, {
      method: 'POST',
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`Erro de rede: ${response.status} - ${response.statusText}`);
    }
    
    const result = await response.json();

    // Se a resposta do backend indicar um erro, lança uma exceção com a mensagem específica.
    if (result.success === false && result.error) {
       throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    // Relança o erro para ser capturado no local da chamada (e.g., no componente).
    console.error("Erro na API:", error);
    throw error;
  }
};

export interface InitialData {
  availableUsers: UserProfile[];
  matches: UserProfile[];
  swipeHistory: { profile: UserProfile; direction: SwipeDirection }[];
}

export const getInitialData = (currentUserMatricula: string): Promise<InitialData> => {
  return postRequest({ action: 'getInitialData', matricula: currentUserMatricula });
};

export const loginUser = (matricula: string, password: string): Promise<{ success: boolean; requiresPasswordChange: boolean; userProfile: UserProfile; isManager: boolean }> => {
  return postRequest({ action: 'login', matricula, password });
};

export const setUserPassword = (matricula: string, newPassword: string): Promise<{ success: boolean }> => {
  return postRequest({ action: 'setPassword', matricula, newPassword });
};

export const updateUserProfileApi = (userProfile: UserProfile): Promise<{ success: boolean; updatedProfile: UserProfile }> => {
  return postRequest({ action: 'updateProfile', profile: userProfile });
};

export const uploadProfilePicture = (matricula: string, base64Image: string): Promise<{ success: boolean; imageUrl: string }> => {
  return postRequest({ action: 'uploadImage', matricula, image: base64Image });
};

export const recordSwipe = (userId: string, profileId: string, direction: 'left' | 'right'): Promise<{ match: boolean }> => {
  return postRequest({ action: 'swipe', userId, profileId, direction });
};

export const undoLastSwipe = (userId: string): Promise<{ success: boolean }> => {
  return postRequest({ action: 'undoSwipe', userId });
};

export const confirmSwap = (currentUserMatricula: string, matchedUserMatricula: string): Promise<{ success: boolean }> => {
  return postRequest({ action: 'confirmSwap', userId: currentUserMatricula, partnerId: matchedUserMatricula });
};

export const getMessages = async (chatId: string): Promise<{ messages: Message[], swapStatus: SwapStatus | null }> => {
  const result = await postRequest({ action: 'getMessages', chatId });
  // Garante que a resposta tenha a estrutura esperada antes de retorná-la.
  if (result && Array.isArray(result.messages)) {
    return result;
  }
  // Retorna um estado padrão vazio se a resposta for malformada, prevenindo quebras.
  return { messages: [], swapStatus: null };
};

export const sendMessage = (senderMatricula: string, receiverMatricula: string, text: string): Promise<{ success: boolean }> => {
  return postRequest({ action: 'sendMessage', senderMatricula, receiverMatricula, text });
};

export const getLocations = async (): Promise<LocationData[]> => {
    const result = await postRequest({ action: 'getLocations' });
    return Array.isArray(result) ? result : [];
};

export const getCargos = async (): Promise<string[]> => {
    const result = await postRequest({ action: 'getCargos' });
    return Array.isArray(result) ? result : [];
};

export const getBairros = async (): Promise<string[]> => {
    const result = await postRequest({ action: 'getBairros' });
    return Array.isArray(result) ? result : [];
};

// Funções para Gerente
export const getConfirmedSwaps = async (): Promise<ConfirmedSwap[]> => {
    const result = await postRequest({ action: 'getConfirmedSwaps' });
    return Array.isArray(result) ? result : [];
};

export const managerApproveSwap = async (swapId: string): Promise<{ success: boolean }> => {
    return postRequest({ action: 'managerApprove', swapId });
};

export const managerRejectSwap = async (swapId: string): Promise<{ success: boolean }> => {
    return postRequest({ action: 'managerReject', swapId });
};