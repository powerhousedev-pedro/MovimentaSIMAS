
import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { UserProfile, LocationData } from '../types';
import { AuthContext } from '../auth/AuthContext';
import { getLocations, getCargos, getBairros } from '../services/api';

const ProfileScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLDivElement>(null);

  if (!auth || !auth.currentUser) {
    return <div>Carregando perfil...</div>;
  }

  const { currentUser, updateUserProfile, uploadProfilePicture } = auth;
  const [formData, setFormData] = useState<UserProfile>({
      ...currentUser,
      areaDeInteresse: currentUser.areaDeInteresse || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [locations, setLocations] = useState<LocationData[]>([]);
  const [suggestions, setSuggestions] = useState<LocationData[]>([]);
  const [isLocationListVisible, setLocationListVisible] = useState(false);

  const [cargos, setCargos] = useState<string[]>([]);
  const [bairros, setBairros] = useState<string[]>([]);

  const fetchDropdownData = useCallback(async () => {
    try {
        const [locationsData, cargosData, bairrosData] = await Promise.all([
            getLocations(),
            getCargos(),
            getBairros(),
        ]);
        setLocations(locationsData);
        setCargos(cargosData);
        setBairros(bairrosData);
    } catch (err) {
        console.error("Failed to fetch page data", err);
        setError("Não foi possível carregar os dados de lotação e cargos.");
    }
  }, []);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
            setLocationListVisible(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setError('');
      setSuccess('');
      try {
        await uploadProfilePicture(file);
        setSuccess('Foto alterada com sucesso!');
      } catch (err) {
        setError((err as Error).message || "Não foi possível alterar a foto.");
      } finally {
        setIsUploading(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement; // Cast para acessar 'checked'

    // Lógica específica e isolada para o checkbox 'disponivelParaTroca'
    if (name === 'disponivelParaTroca' && type === 'checkbox') {
        setFormData(prev => ({ ...prev, [name]: target.checked }));
        return; // Finaliza a execução para este caso
    }

    // Lógica específica e isolada para os checkboxes de 'areaDeInteresse'
    if (name === 'areaDeInteresse' && type === 'checkbox') {
        const currentInterests = formData.areaDeInteresse ? formData.areaDeInteresse.split(',') : [];
        let newInterests;
        if (target.checked) {
            newInterests = [...currentInterests, value];
        } else {
            newInterests = currentInterests.filter(interest => interest !== value);
        }
        // Remove entradas vazias caso o array original estivesse vazio
        const cleanedInterests = newInterests.filter(i => i);
        setFormData(prev => ({ ...prev, areaDeInteresse: cleanedInterests.join(',') }));
        return; // Finaliza a execução para este caso
    }

    // Lógica padrão para todos os outros inputs
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, location: value, currentPosition: '', bairro: '' }));
    
    if (value) {
        const filteredSuggestions = locations.filter(loc => loc.lotacao.toLowerCase().includes(value.toLowerCase()));
        setSuggestions(filteredSuggestions);
        setLocationListVisible(true);
    } else {
        setSuggestions(locations);
        setLocationListVisible(true);
    }
  };
  
  const handleLocationFocus = () => {
    setSuggestions(locations);
    setLocationListVisible(true);
  };

  const handleLocationSelect = (location: LocationData) => {
    setFormData(prev => ({
        ...prev,
        location: location.lotacao,
        currentPosition: location.vinculacao,
        bairro: location.bairro,
    }));
    setLocationListVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const updatedProfile = await updateUserProfile(formData);
      setFormData(updatedProfile); // Atualiza o form com os dados do backend (incluindo isLocked)
      setSuccess("Perfil salvo com sucesso!");
    } catch (err) {
      setError((err as Error).message || "Não foi possível salvar o perfil.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const inputStyle = "w-full p-3 bg-[#161B29]/80 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 transition disabled:bg-gray-700/50 disabled:cursor-not-allowed";
  const labelStyle = "block text-sm font-medium text-gray-300 mb-2";
  const isProfileLocked = formData.isLocked;

  return (
    <div className="w-full max-w-lg mx-auto text-white">
      <h2 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400">Meu Perfil</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative p-1 rounded-full bg-gray-700">
            <img
              src={currentUser.imageUrl}
              alt="Foto do Perfil"
              className={`w-32 h-32 rounded-full object-cover border-2 border-[#161B29] transition-opacity ${isUploading ? 'opacity-50' : 'opacity-100'}`}
            />
            {isUploading && (
                <div className="absolute inset-0 flex justify-center items-center bg-black/50 rounded-full">
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" />
          <button type="button" className="text-sm text-teal-400 hover:underline disabled:text-gray-500" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? 'Enviando...' : 'Alterar Foto'}
          </button>
        </div>
        
        <div className={`bg-[#161B29]/80 p-4 rounded-lg border border-white/10 ${isProfileLocked ? 'opacity-60' : ''}`}>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-medium text-gray-200">Disponível para troca?</span>
            <div className="relative inline-flex items-center">
              <input type="checkbox" name="disponivelParaTroca" checked={formData.disponivelParaTroca} onChange={handleChange} className="sr-only peer" disabled={isProfileLocked} />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-400 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r from-indigo-500 to-teal-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </div>
          </label>
           {isProfileLocked 
            ? <p className="text-xs text-amber-400 mt-2">Você está em uma negociação. Para ficar disponível novamente, a troca atual deve ser finalizada ou cancelada.</p>
            : <p className="text-xs text-gray-400 mt-2">Ative para que outros servidores possam ver seu perfil.</p>
           }
        </div>

        <div>
          <label htmlFor="name" className={labelStyle}>Nome Completo</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={inputStyle} required />
        </div>

         <div>
          <label htmlFor="email" className={labelStyle}>Email de Contato</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))} className={inputStyle} required placeholder="seunome@email.com"/>
        </div>
        
        <div ref={locationInputRef}>
          <label htmlFor="location" className={labelStyle}>Lotação/Departamento</label>
           <div className="relative">
             <input type="text" id="location" name="location" value={formData.location} onChange={handleLocationChange} onFocus={handleLocationFocus} className={inputStyle} required autoComplete="off" placeholder="Digite para buscar sua lotação..." disabled={isProfileLocked} />
            {isLocationListVisible && !isProfileLocked && suggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-[#1e293b] border border-white/10 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                {suggestions.map((loc, index) => (
                  <li key={index} className="p-3 text-white hover:bg-teal-500/20 cursor-pointer" onClick={() => handleLocationSelect(loc)}>
                    {loc.lotacao}
                  </li>
                ))}
              </ul>
            )}
           </div>
        </div>

        <div>
          <label htmlFor="currentPosition" className={labelStyle}>Vinculação (CAS/NC) Atual</label>
          <input type="text" id="currentPosition" name="currentPosition" value={formData.currentPosition} className={`${inputStyle} bg-gray-700/50 cursor-not-allowed`} readOnly />
        </div>
        
        <div>
          <label htmlFor="bairro" className={labelStyle}>Bairro</label>
          <input type="text" id="bairro" name="bairro" value={formData.bairro || ''} className={`${inputStyle} bg-gray-700/50 cursor-not-allowed`} readOnly />
        </div>

        <div>
            <label htmlFor="cargo" className={labelStyle}>Cargo</label>
            <select id="cargo" name="cargo" value={formData.cargo} onChange={handleChange} className={inputStyle} required>
                <option value="" disabled>Selecione seu cargo</option>
                {cargos.map(cargo => <option key={cargo} value={cargo}>{cargo}</option>)}
            </select>
        </div>

        <div>
            <label className={labelStyle}>Área de Interesse (Bairros)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-[#161B29]/80 border border-white/10 rounded-lg max-h-60 overflow-y-auto">
                {bairros.map(bairro => (
                    <label key={bairro} className="flex items-center space-x-2 text-white cursor-pointer">
                        <input type="checkbox" name="areaDeInteresse" value={bairro} checked={(formData.areaDeInteresse || '').split(',').includes(bairro)} onChange={handleChange} className="form-checkbox h-5 w-5 rounded bg-gray-700 border-gray-600 text-teal-500 focus:ring-teal-500" />
                        <span>{bairro}</span>
                    </label>
                ))}
            </div>
        </div>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center">{success}</p>}

        <div className="pt-4 space-y-4">
          <button type="submit" disabled={isSaving || isUploading} className="w-full bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full hover:from-indigo-600 hover:to-teal-600 transition-all duration-300 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed">
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileScreen;
