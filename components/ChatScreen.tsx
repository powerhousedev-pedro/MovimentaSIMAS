
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Message, SwapStatus } from '../types';
import { ArrowLeftIcon, SendIcon, SwapIcon } from './Icons';
import { confirmSwap, getMessages, sendMessage } from '../services/api';
import ConfirmSwapModal from './ConfirmSwapModal';

interface ChatScreenProps {
  matchedUser: UserProfile;
  currentUser: UserProfile;
  onBack: () => void;
}

const createChatId = (matricula1: string, matricula2: string) => {
    return [matricula1, matricula2].sort().join('-');
};

const ChatScreen: React.FC<ChatScreenProps> = ({ matchedUser, currentUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [swapStatus, setSwapStatus] = useState<SwapStatus | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRequestingSwap, setIsRequestingSwap] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatId = createChatId(currentUser.matricula, matchedUser.matricula);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessagesAndStatus = useCallback(async () => {
    try {
      const { messages: fetchedMessages, swapStatus: fetchedStatus } = await getMessages(chatId);
      setMessages(fetchedMessages);
      setSwapStatus(fetchedStatus);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setIsLoadingMessages(true);
    fetchMessagesAndStatus().finally(() => {
      setIsLoadingMessages(false);
    });

    const interval = setInterval(fetchMessagesAndStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchMessagesAndStatus]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const optimisticMessage: Message = {
      chatId,
      sender: currentUser.matricula,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    scrollToBottom();
    
    try {
        await sendMessage(currentUser.matricula, matchedUser.matricula, optimisticMessage.text);
        // Não precisa refazer o fetch, a UI já foi atualizada otimisticamente
    } catch (error) {
        console.error("Failed to send message:", error);
        // Reverte a atualização otimista em caso de erro
        setMessages(prev => prev.filter(msg => msg.timestamp !== optimisticMessage.timestamp));
    }
  };

  const handleConfirmSwap = async () => {
    setIsRequestingSwap(true);
    try {
        await confirmSwap(currentUser.matricula, matchedUser.matricula);
        await fetchMessagesAndStatus(); // Força a atualização do status
    } catch (error) {
        console.error("Erro ao confirmar troca", error);
    } finally {
        setIsRequestingSwap(false);
        setShowConfirmModal(false);
    }
  };

  // Lógica refatorada para determinar o estado do botão de troca
  const getSwapButtonState = () => {
    // Caso 1: A troca foi confirmada por ambos e enviada à gerência.
    if (swapStatus?.status === 'confirmed') {
      return { text: 'Troca Solicitada', disabled: true };
    }

    if (swapStatus) {
      // Caso 2: O usuário atual já confirmou e aguarda a outra parte.
      const isCurrentUserConfirmed =
        (swapStatus.user1 === currentUser.matricula && swapStatus.user1_confirmed) ||
        (swapStatus.user2 === currentUser.matricula && swapStatus.user2_confirmed);
      if (isCurrentUserConfirmed) {
        return { text: 'Aguardando Confirmação', disabled: true };
      }
    }
    
    // Caso 3 (padrão): O usuário atual pode iniciar ou confirmar a troca.
    return { text: 'Confirmar Troca', disabled: false };
  };

  const { text: swapButtonText, disabled: swapButtonDisabled } = getSwapButtonState();

  const MessageBubble = ({ text, isMine }: { text: string, isMine: boolean }) => (
    <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl break-words ${isMine ? 'bg-gradient-to-r from-indigo-500 to-teal-500 text-white rounded-br-none' : 'bg-[#161B29] text-gray-200 rounded-bl-none'}`}>
        {text}
      </div>
    </div>
  );
  
  const SystemMessage = ({ text }: { text: string }) => (
    <div className="text-center text-xs text-gray-400/80 py-2 px-4 italic">
      {text}
    </div>
  );

  return (
    <>
      <div className="w-full h-full flex flex-col text-white bg-[#0A0E1A]">
        {/* Cabeçalho do Chat */}
        <header className="flex-shrink-0 flex items-center p-3 border-b border-white/10 bg-gray-900/60 backdrop-blur-lg">
          <button onClick={onBack} className="mr-4 p-1 rounded-full hover:bg-white/10">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <img src={matchedUser.imageUrl} alt={matchedUser.name} className="w-10 h-10 rounded-full object-cover mr-3"/>
          <div className="flex-grow">
              <h2 className="font-bold">{matchedUser.name}</h2>
          </div>
          <button 
            onClick={() => setShowConfirmModal(true)}
            disabled={swapButtonDisabled}
            className="flex items-center gap-2 text-sm bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-full transition-all"
            title={swapButtonText}
          >
              <SwapIcon className="w-5 h-5" />
              <span className="hidden sm:inline">{swapButtonText}</span>
          </button>
        </header>

        {/* Área de Mensagens */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {isLoadingMessages ? (
            <div className="text-center text-gray-400">Carregando mensagens...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
                <p>Esta é a sua conversa com {matchedUser.name}.</p>
                <p className="text-sm">Envie a primeira mensagem!</p>
            </div>
          ) : (
            messages.map((msg, index) => 
              msg.sender === 'system' 
              ? <SystemMessage key={index} text={msg.text} />
              : <MessageBubble key={msg.timestamp + index} text={msg.text} isMine={msg.sender === currentUser.matricula} />
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input de Mensagem */}
        <form onSubmit={handleSend} className="flex-shrink-0 p-3 flex items-center border-t border-white/10 bg-gray-900/60 backdrop-blur-lg">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-grow p-3 bg-[#161B29]/80 backdrop-blur-sm border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
          />
          <button type="submit" className="ml-3 p-3 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full hover:from-indigo-600 hover:to-teal-600 transition-all">
            <SendIcon className="w-6 h-6 text-white" />
          </button>
        </form>
      </div>
      {showConfirmModal && (
        <ConfirmSwapModal 
            matchedUser={matchedUser}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={handleConfirmSwap}
            isLoading={isRequestingSwap}
        />
      )}
    </>
  );
};

export default ChatScreen;
