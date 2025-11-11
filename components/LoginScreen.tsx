import React, { useState, useContext } from 'react';
import { AuthContext } from '../auth/AuthContext';

const LoginScreen: React.FC = () => {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await auth?.login(matricula, password);
    // Fix: Added curly braces to the catch block to fix syntax error.
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
         <h1 className="text-4xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">
                <span className="font-bold">Movimenta</span>
                <span className="font-light ml-2">SIMAS</span>
            </span>
        </h1>
        <p className="text-gray-400 mt-2">Uma iniciativa do SIMAS para melhorar a vida do servidor.</p>
       </div>
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="matricula" className={labelStyle}>Matrícula</label>
            <input 
              type="text" 
              id="matricula" 
              value={matricula} 
              onChange={(e) => setMatricula(e.target.value)} 
              className={inputStyle} 
              required 
            />
          </div>
          <div>
            <label htmlFor="password" className={labelStyle}>Senha</label>
            <input 
              type="password" 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
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
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;