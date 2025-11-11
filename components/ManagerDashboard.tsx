
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { ConfirmedSwap } from '../types';
import { getConfirmedSwaps, managerApproveSwap, managerRejectSwap } from '../services/api';
import { AuthContext } from '../auth/AuthContext';
import { LogoutIcon, HeartIcon, XIcon } from './Icons';

const LoadingComponent: React.FC = () => (
    <div className="flex justify-center items-center h-full">
        <svg className="animate-spin h-8 w-8 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const SwapApprovalCard: React.FC<{ swap: ConfirmedSwap; onApprove: (id: string) => void; onReject: (id: string) => void; isLoading: string | null; }> = ({ swap, onApprove, onReject, isLoading }) => {
    const { user1, user2, id } = swap;
    const isCardLoading = isLoading === id;

    const UserDisplay = ({ user }) => (
        <div className="flex-1 p-4 bg-gray-800/50 rounded-lg text-center">
            <img src={user.imageUrl} alt={user.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-2 border-gray-600"/>
            <p className="font-bold text-lg">{user.name}</p>
            <p className="text-sm text-gray-400">Mat: {user.matricula}</p>
            <p className="text-sm text-gray-400">Cargo: {user.cargo}</p>
            <p className="mt-2 text-sm font-semibold">{user.location}</p>
            <p className="text-xs text-gray-500">{user.bairro}</p>
        </div>
    );

    return (
        <div className="bg-[#161B29] border border-white/10 rounded-xl p-4 relative">
            {isCardLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center rounded-xl z-10">
                    <LoadingComponent />
                </div>
            )}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <UserDisplay user={user1} />
                <div className="flex items-center justify-center p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-teal-400 transform md:rotate-0 -rotate-90">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h18m-7.5-9L21 7.5m0 0L16.5 3M21 7.5H3" />
                    </svg>
                </div>
                <UserDisplay user={user2} />
            </div>
            <div className="flex justify-center items-center gap-6 mt-4 pt-4 border-t border-white/10">
                <button
                    onClick={() => onReject(id)}
                    className="bg-rose-500/20 text-rose-400 rounded-full p-3 hover:bg-rose-500/40 transition-colors"
                    aria-label="Rejeitar Troca"
                >
                    <XIcon className="w-7 h-7" />
                </button>
                <button
                    onClick={() => onApprove(id)}
                    className="bg-teal-500/20 text-teal-400 rounded-full p-3 hover:bg-teal-500/40 transition-colors"
                    aria-label="Aprovar Troca"
                >
                    <HeartIcon className="w-7 h-7" />
                </button>
            </div>
        </div>
    );
};


const ManagerDashboard: React.FC = () => {
    const { logout } = useContext(AuthContext)!;
    const [swaps, setSwaps] = useState<ConfirmedSwap[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setError('');
            const confirmedSwaps = await getConfirmedSwaps();
            setSwaps(confirmedSwaps);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (action: 'approve' | 'reject', swapId: string) => {
        setActionLoading(swapId);
        try {
            if (action === 'approve') {
                await managerApproveSwap(swapId);
            } else {
                await managerRejectSwap(swapId);
            }
            // Refresca a lista após a ação
            fetchData();
        } catch (err) {
            setError(`Erro ao ${action === 'approve' ? 'aprovar' : 'rejeitar'} a troca: ${(err as Error).message}`);
        } finally {
            setActionLoading(null);
        }
    };
    
    const filteredSwaps = useMemo(() => {
        if (!searchTerm) return swaps;
        return swaps.filter(swap => 
            swap.user1.matricula.includes(searchTerm) || 
            swap.user2.matricula.includes(searchTerm)
        );
    }, [swaps, searchTerm]);

    return (
        <div className="min-h-screen w-full bg-[#0A0E1A] text-white p-4 sm:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">
                        Painel de Gerenciamento
                    </h1>
                    <p className="text-gray-400">Aprovações de Troca Pendentes</p>
                </div>
                <button onClick={logout} className="text-gray-400 hover:text-white transition-colors" aria-label="Sair">
                    <LogoutIcon className="h-7 w-7" />
                </button>
            </header>
            
            <div className="mb-6">
                <input
                    type="search"
                    placeholder="Buscar por matrícula..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full max-w-md p-3 bg-[#161B29]/80 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                />
            </div>
            
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {isLoading ? (
                <LoadingComponent />
            ) : filteredSwaps.length === 0 ? (
                <div className="text-center text-gray-400 mt-20">
                    <p className="text-lg">Nenhuma solicitação de troca pendente.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredSwaps.map(swap => (
                        <SwapApprovalCard key={swap.id} swap={swap} onApprove={handleAction.bind(null, 'approve')} onReject={handleAction.bind(null, 'reject')} isLoading={actionLoading} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManagerDashboard;
