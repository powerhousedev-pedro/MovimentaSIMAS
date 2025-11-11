
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthContextType, UserProfile } from '../types';
import { loginUser, setUserPassword as apiSetUserPassword, updateUserProfileApi, uploadProfilePicture as apiUploadProfilePicture } from '../services/api';

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper para redimensionar, comprimir e converter a imagem para Base64.
const resizeAndCompressImage = (file: File, maxSize = 256): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Não foi possível obter o contexto do canvas.'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Exporta como JPEG com 70% de qualidade para compressão.
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Efeito para carregar o usuário do localStorage na inicialização.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      const storedIsManager = localStorage.getItem('isManager') === 'true';
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
        setIsManager(storedIsManager);
      }
    } catch (error) {
      console.error("Falha ao carregar usuário do localStorage, limpando...", error);
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (matricula: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await loginUser(matricula, password);
      if (response.success && response.userProfile) {
        setCurrentUser(response.userProfile);
        setRequiresPasswordChange(response.requiresPasswordChange);
        setIsManager(response.isManager || false);
        
        if (!response.requiresPasswordChange) {
          localStorage.setItem('currentUser', JSON.stringify(response.userProfile));
          localStorage.setItem('isManager', String(response.isManager || false));
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPassword = useCallback(async (newPassword: string) => {
    if (!currentUser) throw new Error("Nenhum usuário logado para definir a senha.");
    
    setIsLoading(true);
    try {
      await apiSetUserPassword(currentUser.matricula, newPassword);
      setRequiresPasswordChange(false);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      localStorage.setItem('isManager', String(isManager));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isManager]);
  
  const updateUserProfile = useCallback(async (profile: UserProfile): Promise<UserProfile> => {
    const { success, updatedProfile } = await updateUserProfileApi(profile);
    if(success && updatedProfile) {
      setCurrentUser(updatedProfile);
      localStorage.setItem('currentUser', JSON.stringify(updatedProfile));
      return updatedProfile;
    }
    throw new Error("Falha ao atualizar o perfil.");
  }, []);

  const uploadProfilePicture = useCallback(async (file: File) => {
    if (!currentUser) throw new Error("Nenhum usuário logado para alterar a foto.");
    
    const base64Image = await resizeAndCompressImage(file);
    const response = await apiUploadProfilePicture(currentUser.matricula, base64Image);

    if (response.success && response.imageUrl) {
        const updatedUser = { ...currentUser, imageUrl: response.imageUrl };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  }, [currentUser]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setRequiresPasswordChange(false);
    setIsManager(false);
    localStorage.clear();
  }, []);

  const value: AuthContextType = {
    currentUser,
    isLoading,
    requiresPasswordChange,
    isManager,
    login,
    logout,
    setPassword,
    updateUserProfile,
    uploadProfilePicture
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};