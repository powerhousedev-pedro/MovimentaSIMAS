import React, { useState, useContext } from 'react';
import { AuthContext } from '../auth/AuthContext';

const SetPasswordScreen: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await auth?.setPassword(newPassword);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = "w-full p-3 bg-[#161B29]/80 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition";
  const labelStyle = "block text-sm font-medium text-gray-300 mb-2";

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">Primeiro Acesso</h1>
        <p className="text-gray-400 mt-2">Para sua segurança, defina uma nova senha.</p>
      </div>
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className={labelStyle}>Nova Senha</label>
            <input 
              type="password" 
              id="newPassword" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              className={inputStyle} 
              required 
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelStyle}>Confirmar Nova Senha</label>
            <input 
              type="password" 
              id="confirmPassword" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className={inputStyle} 
              required 
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="pt-4">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full hover:from-indigo-600 hover:to-teal-600 transition-all duration-300 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Definir Senha e Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordScreen;