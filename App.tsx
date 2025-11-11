

import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import Header from './components/Header';
import ProfileCard from './components/ProfileCard';
import SwipeButtons from './components/SwipeButtons';
import MatchesScreen from './components/MatchesScreen';
import MatchModal from './components/MatchModal';
import ProfileScreen from './components/ProfileScreen';
import LoginScreen from './components/LoginScreen';
import SetPasswordScreen from './components/SetPasswordScreen';
import HistoryScreen from './components/HistoryScreen';
import ChatScreen from './components/ChatScreen';
import ManagerDashboard from './components/ManagerDashboard'; // Importa o novo painel do gerente
import { recordSwipe, undoLastSwipe, getInitialData } from './services/api';
import { UserProfile, SwipeDirection, View } from './types';
import { AuthProvider, AuthContext } from './auth/AuthContext';

// --- Componente de Carregamento Dinâmico ---
const LoadingScreen: React.FC<{ steps: string[]; currentStepIndex: number; error?: string }> = ({ steps, currentStepIndex, error }) => (
    <div className="min-h-screen flex flex-col justify-center items-center text-white px-4">
        <svg className="animate-spin h-10 w-10 text-teal-400 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="w-full max-w-sm text-left">
            {steps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isActive = index === currentStepIndex;
                const isPending = index > currentStepIndex;

                return (
                    <div key={index} className="flex items-center space-x-3 mb-3 transition-all duration-500 ease-in-out">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-teal-500' : isActive ? 'border-2 border-teal-400' : 'bg-gray-700'}`}>
                            {isCompleted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            ) : isActive ? (
                                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                            ) : null}
                        </div>
                        <p className={`transition-colors duration-300 ${isCompleted ? 'text-gray-400 line-through' : ''} ${isActive ? 'text-teal-400 font-semibold' : ''} ${isPending ? 'text-gray-500' : ''}`}>
                            {step}
                        </p>
                    </div>
                );
            })}
        </div>
        {error && <p className="mt-6 text-red-500 text-center">{error}</p>}
    </div>
);


// Estrutura raiz que envolve a aplicação com o provedor de autenticação.
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// Roteador principal: decide qual tela exibir com base no estado de autenticação.
const AppContent: React.FC = () => {
  const auth = useContext(AuthContext);

  if (auth?.isLoading) {
    return <LoadingScreen steps={['Autenticando...']} currentStepIndex={0} />;
  }
  if (!auth?.currentUser) {
    return <LoginScreen />;
  }
  if (auth.requiresPasswordChange) {
    return <SetPasswordScreen />;
  }
  if (auth.isManager) {
    return <ManagerDashboard />;
  }
  return <MainApp />;
};

// Componente do aplicativo principal, visível após um login bem-sucedido.
const MainApp: React.FC = () => {
  const { currentUser, logout } = useContext(AuthContext)!;

  // Estado da aplicação
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<{ profile: UserProfile; direction: SwipeDirection }[]>([]);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  
  // Estado de navegação e UI
  const [view, setView] = useState<View>('swiping');
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false); // Apenas para ações que bloqueiam a UI, como o Undo.
  const [selectedChatUser, setSelectedChatUser] = useState<UserProfile | null>(null);

  // Etapas para a tela de carregamento dinâmica
  const loadingSteps = useMemo(() => [
    'Autenticando seu perfil...',
    'Carregando seu histórico de interações...',
    'Buscando suas combinações...',
    'Preparando novos perfis para você...',
  ], []);
  const [currentLoadingStepIndex, setCurrentLoadingStepIndex] = useState(0);

  useEffect(() => {
    // Fix: Changed NodeJS.Timeout to ReturnType<typeof setInterval> for browser compatibility.
    let interval: ReturnType<typeof setInterval>;
    if (isAppLoading) {
      interval = setInterval(() => {
        setCurrentLoadingStepIndex(prev => {
          if (prev < loadingSteps.length - 1) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isAppLoading, loadingSteps.length]);

  // Carrega todos os dados iniciais com uma única chamada de API.
  const loadInitialData = useCallback(async () => {
    if (!currentUser) return;
    setIsAppLoading(true);
    setCurrentLoadingStepIndex(0);
    setLoadingError('');
    try {
      const initialData = await getInitialData(currentUser.matricula);
      setAvailableUsers(initialData.availableUsers);
      setMatches(initialData.matches);
      setSwipeHistory(initialData.swipeHistory);
    } catch (error) {
      console.error("Falha ao carregar dados iniciais:", error);
      setLoadingError(`Erro ao carregar: ${(error as Error).message}. Tente recarregar a página.`);
    } finally {
      setIsAppLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);
  
  const swipableProfiles = availableUsers; // O backend já retorna a lista filtrada.
  
  // Lida com a ação de swipe (like/dislike) de forma otimista.
  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (swipableProfiles.length === 0) return;

    const swipedProfile = swipableProfiles[0];

    // Atualização otimista da UI para resposta instantânea.
    setAvailableUsers(prev => prev.slice(1));
    setSwipeHistory(prev => [...prev, { profile: swipedProfile, direction }]);


    // Chamada da API em segundo plano.
    recordSwipe(currentUser.matricula, swipedProfile.matricula, direction)
      .then(result => {
        if (result.match) {
          setMatchedUser(swipedProfile);
          setMatches(prev => [...prev, swipedProfile]);
          setShowMatchModal(true);
        }
      })
      .catch(error => {
        console.error("Falha ao registrar swipe:", error);
        loadInitialData(); // Reverte o estado recarregando tudo em caso de erro.
      });
  }, [swipableProfiles, currentUser, loadInitialData]);

  // Desfaz a última ação de swipe.
  const handleUndoSwipe = useCallback(async () => {
    if (swipeHistory.length === 0 || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await undoLastSwipe(currentUser.matricula);
      // Recarregar os dados é a forma mais segura de garantir consistência.
      await loadInitialData();
      if (showMatchModal) setShowMatchModal(false);
    } catch (error) {
       console.error("Erro ao desfazer swipe:", error);
    } finally {
      setIsActionLoading(false);
    }
  }, [currentUser, swipeHistory.length, isActionLoading, loadInitialData, showMatchModal]);
  
  const handleSelectChat = (match: UserProfile) => {
    setSelectedChatUser(match);
    setView('chat');
  };
  
  const handleCloseMatchModal = () => {
      setShowMatchModal(false);
      setMatchedUser(null);
  };

  const renderView = () => {
    switch (view) {
      case 'swiping':
        if (swipableProfiles.length > 0) {
          return (
            <div className="flex flex-col h-full w-full justify-center items-center">
              <div className="relative w-full max-w-md aspect-[3/4] mb-8">
                <ProfileCard profile={swipableProfiles[0]} />
              </div>
              <SwipeButtons onSwipe={handleSwipe} />
            </div>
          );
        }
        return (
          <div className="text-white text-center mt-48 px-4">
            <h2 className="text-2xl md:text-3xl font-bold">Fim da busca!</h2>
            <p className="text-gray-400 mt-2">Você viu todos os perfis disponíveis com base nos seus filtros. Volte mais tarde ou ajuste seus interesses no perfil!</p>
          </div>
        );
      case 'matches': return <MatchesScreen matches={matches} onSelectMatch={handleSelectChat} />;
      case 'profile': return <ProfileScreen />;
      case 'history': return <HistoryScreen history={swipeHistory} onUndo={handleUndoSwipe} isUndoLoading={isActionLoading} />;
      case 'chat':
          if (!selectedChatUser) {
              setView('matches'); // Medida de segurança
              return null;
          }
          return <ChatScreen matchedUser={selectedChatUser} currentUser={currentUser} onBack={() => setView('matches')} />;
      default:
        return null;
    }
  };

  if (isAppLoading || loadingError) {
    return <LoadingScreen steps={loadingSteps} currentStepIndex={currentLoadingStepIndex} error={loadingError} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {view !== 'chat' && <Header currentView={view} onViewChange={setView} onLogout={logout} />}
      
      <main className={`flex-grow overflow-y-auto w-full pb-8 ${view === 'chat' ? 'h-full' : 'pt-[80px] px-4 sm:px-6 lg:px-8'}`}>
        {renderView()}
      </main>
      
      {showMatchModal && matchedUser && (
        <MatchModal currentUser={currentUser} matchedUser={matchedUser} onClose={handleCloseMatchModal} />
      )}
    </div>
  );
};

export default App;