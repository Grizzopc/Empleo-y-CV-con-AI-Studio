
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import { analyzeCV, matchCompanies, compareCVs } from './services/geminiService';
import { CVAnalysisResult, CompanyMatch, AnalysisStatus, UserPreferences, AnalysisHistoryItem, CVComparisonResult } from './types';
import { 
  Upload, FileText, Sparkles, AlertCircle, Info, Trash2, ArrowRight, 
  TrendingUp, TrendingDown, Minus, Check, Scale, Loader2, BarChart3, ChevronRight,
  LogOut, User as UserIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface User {
  name: string;
  email: string;
  photo?: string;
  syncDate: string;
}

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [user, setUser] = useState<User | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; type: string; name: string } | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<CVComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [prefs, setPrefs] = useState<UserPreferences>({
    hasDisabilityCertificate: false,
    prefersRemote: false,
    prefersFlexible: false,
    prefersReducedHours: false,
    prefersInclusiveEnvironment: false,
    preferredLocation: 'Remoto',
    targetSector: '',
    employmentType: 'Full-time'
  });
  
  const [result, setResult] = useState<CVAnalysisResult | null>(null);
  const [matches, setMatches] = useState<CompanyMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('analysis_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleGoogleLogin = () => {
    setIsSyncing(true);
    // Simular latencia de red de Google Auth
    setTimeout(() => {
      const mockUser: User = {
        name: "Usuario de Google",
        email: "usuario.laboral@gmail.com",
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
        syncDate: new Date().toISOString()
      };
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setIsSyncing(false);
      setStatus('history');
    }, 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    setUser(null);
    setStatus('idle');
  };

  const saveToHistory = (newResult: CVAnalysisResult, fileName: string) => {
    const lastItem = history[0];
    const trends: Record<string, 'up' | 'down' | 'stable'> = {};
    
    if (lastItem) {
      Object.keys(newResult.categories).forEach(cat => {
        const current = (newResult.categories as any)[cat];
        const previous = (lastItem.result.categories as any)[cat];
        if (current > previous) trends[cat] = 'up';
        else if (current < previous) trends[cat] = 'down';
        else trends[cat] = 'stable';
      });
    }

    const newItem: AnalysisHistoryItem = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      fileName,
      result: newResult,
      trends
    };

    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    localStorage.setItem('analysis_history', JSON.stringify(newHistory));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileData({ base64, type: file.type, name: file.name });
      setStatus('preferences');
    };
    reader.readAsDataURL(file);
  };

  const startAnalysis = async () => {
    if (!fileData) return;
    setStatus('analyzing');
    setError(null);
    try {
      const res = await analyzeCV(fileData.base64, fileData.type, prefs);
      setResult(res);
      saveToHistory(res, fileData.name);
      setStatus('completed');
      setIsLoadingMatches(true);
      const companyMatches = await matchCompanies(res.summary, prefs);
      setMatches(companyMatches);
      setIsLoadingMatches(false);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForComparison(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const runComparison = async () => {
    if (selectedForComparison.length !== 2) return;
    setIsComparing(true);
    setStatus('comparing');
    const item1 = history.find(h => h.id === selectedForComparison[0])!;
    const item2 = history.find(h => h.id === selectedForComparison[1])!;
    try {
      const res = await compareCVs(item1.result, item2.result);
      setComparisonResult(res);
    } catch (err) {
      setError("Error al comparar versiones");
    } finally {
      setIsComparing(false);
    }
  };

  const getComparisonChartData = () => {
    if (selectedForComparison.length !== 2) return [];
    const item1 = history.find(h => h.id === selectedForComparison[0])!;
    const item2 = history.find(h => h.id === selectedForComparison[1])!;
    
    return Object.keys(item1.result.categories).map(cat => ({
      name: cat.toUpperCase(),
      Anterior: (item1.result.categories as any)[cat],
      Actual: (item2.result.categories as any)[cat]
    }));
  };

  return (
    <Layout 
      onLogoClick={() => setStatus('idle')}
      onLoginClick={user ? () => setStatus('history') : handleGoogleLogin}
      isLoggedIn={!!user}
    >
      <div className="max-w-7xl mx-auto px-4 py-12">
        {isSyncing ? (
          <div className="max-w-2xl mx-auto text-center py-32 space-y-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
              <Loader2 className="w-24 h-24 text-blue-600 animate-spin relative" />
            </div>
            <h2 className="text-4xl font-black text-slate-900">Sincronizando con Google...</h2>
            <p className="text-slate-500 font-bold">Resguardando tu historial en la nube.</p>
          </div>
        ) : status === 'idle' || status === 'error' ? (
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight">
                Impulsá tu carrera en <span className="text-blue-600">Argentina</span>
              </h1>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                Optimizá tu CV con IA de última generación y conectá con ofertas reales verificadas.
              </p>
            </div>
            
            <label className="block max-w-2xl mx-auto h-80 bg-white border-4 border-dashed border-slate-200 rounded-[3rem] hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group relative overflow-hidden shadow-2xl shadow-blue-900/10">
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                <div className="bg-blue-600 p-6 rounded-3xl shadow-xl group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800">Arrastrá tu CV aquí</p>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2">PDF o DOCX • Máximo 5MB</p>
                </div>
              </div>
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
            
            {user && (
              <div className="pt-8 flex flex-col items-center gap-6">
                {history.length > 0 ? (
                  <button onClick={() => setStatus('history')} className="px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-200 transition-all">
                    Ver mi historial ({history.length}) <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <p className="text-slate-400 font-medium">No tenés CVs analizados aún.</p>
                )}
                <button onClick={handleLogout} className="text-red-500 text-xs font-bold flex items-center gap-1 hover:underline">
                  <LogOut className="w-3 h-3" /> Cerrar sesión de {user.name}
                </button>
              </div>
            )}
          </div>
        ) : status === 'history' ? (
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900">Historial Laboral</h2>
                <p className="text-slate-500 font-medium flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Sincronizado: {user?.email}
                </p>
              </div>
              <div className="flex gap-4">
                {selectedForComparison.length === 2 && (
                  <button onClick={runComparison} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-emerald-700 transition-all scale-105">
                    <Scale className="w-5 h-5" /> Comparar Seleccionados
                  </button>
                )}
                <button onClick={() => setStatus('idle')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-blue-700 transition-all">
                  <Upload className="w-5 h-5" /> Nuevo Análisis
                </button>
              </div>
            </div>

            {selectedForComparison.length === 1 && (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 font-bold text-sm animate-pulse">
                Seleccioná un segundo CV para comparar el progreso gráficamente.
              </div>
            )}

            <div className="grid gap-6">
              {history.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => { setResult(item.result); setStatus('completed'); }}
                  className={`bg-white p-8 rounded-[2.5rem] border ${selectedForComparison.includes(item.id) ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-slate-100'} hover:shadow-2xl hover:border-blue-200 transition-all cursor-pointer flex flex-col md:flex-row items-center gap-10 group relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 p-6">
                    <button 
                      onClick={(e) => toggleSelection(item.id, e)}
                      className={`p-3 rounded-2xl border-2 transition-all ${selectedForComparison.includes(item.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-100 text-slate-200 hover:border-emerald-400 hover:text-emerald-400'}`}
                    >
                      <Check className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="bg-blue-50 p-8 rounded-[2rem] text-blue-600 group-hover:scale-105 transition-transform shrink-0">
                    <FileText className="w-12 h-12" />
                  </div>
                  
                  <div className="flex-grow space-y-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">{item.fileName}</h3>
                      <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString('es-AR')}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      {Object.entries(item.result.categories).map(([cat, score]) => (
                        <div key={cat} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase">{cat.substring(0,4)}</p>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-lg font-black text-slate-700">{score}</span>
                            {item.trends?.[cat] === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                            {item.trends?.[cat] === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center md:text-right shrink-0">
                    <div className="text-6xl font-black text-blue-600 mb-2">{item.result.score}</div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PUNTAJE FINAL</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : status === 'comparing' ? (
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest">
                <BarChart3 className="w-4 h-4" /> Comparación Gráfica e IA
              </div>
              <h2 className="text-4xl font-black text-slate-900">Evolución del Perfil</h2>
            </div>

            {isComparing ? (
              <div className="py-24 text-center space-y-6">
                <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto" />
                <p className="text-slate-400 font-black uppercase tracking-widest">La IA está procesando las diferencias...</p>
              </div>
            ) : comparisonResult && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Gráfico de Comparación */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
                   <h3 className="text-xl font-black text-slate-800 mb-8 text-center uppercase tracking-widest">Métricas Comparativas</h3>
                   <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getComparisonChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold', fontSize: 12}} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold', fontSize: 12}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                            cursor={{fill: '#f8fafc'}}
                          />
                          <Legend wrapperStyle={{paddingTop: '20px'}} />
                          <Bar dataKey="Anterior" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-blue-500" /> Veredicto de la IA
                  </h3>
                  <p className="text-lg text-slate-600 leading-relaxed italic border-l-4 border-emerald-500 pl-6 py-2 bg-emerald-50/30 rounded-r-2xl">
                    "{comparisonResult.analysis}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100 space-y-6">
                    <h4 className="text-xl font-black text-emerald-900 flex items-center gap-2">
                      <TrendingUp className="w-6 h-6" /> Optimizaciones Logradas
                    </h4>
                    <ul className="space-y-4">
                      {comparisonResult.improvements.map((imp, i) => (
                        <li key={i} className="flex gap-3 text-emerald-800 text-sm font-medium">
                          <Check className="w-5 h-5 shrink-0" /> {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 p-10 rounded-[3rem] border border-amber-100 space-y-6">
                    <h4 className="text-xl font-black text-amber-900 flex items-center gap-2">
                      <AlertCircle className="w-6 h-6" /> Qué le queda por mejorar
                    </h4>
                    <ul className="space-y-4">
                      {comparisonResult.remainingGaps.map((gap, i) => (
                        <li key={i} className="flex gap-3 text-amber-800 text-sm font-medium">
                          <ArrowRight className="w-5 h-5 shrink-0" /> {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="text-center">
                   <button onClick={() => setStatus('history')} className="px-12 py-5 bg-white border-2 border-slate-200 rounded-3xl font-black text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-xl">
                      Volver al Historial
                   </button>
                </div>
              </div>
            )}
          </div>
        ) : status === 'preferences' ? (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Configurá tu Perfil</h2>
            <p className="text-slate-500 mb-10 font-medium">Afinamos la búsqueda según tus necesidades reales.</p>
            <div className="space-y-8">
              <section className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 space-y-6">
                <label className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-blue-400 transition-all">
                  <input type="checkbox" checked={prefs.hasDisabilityCertificate} onChange={e => setPrefs({...prefs, hasDisabilityCertificate: e.target.checked})} className="w-6 h-6 accent-blue-600" />
                  <span className="font-black text-slate-700">Tengo Certificado CUD (Discapacidad)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer">
                    <input type="checkbox" checked={prefs.prefersRemote} onChange={e => setPrefs({...prefs, prefersRemote: e.target.checked})} className="accent-blue-600" />
                    <span className="text-xs font-black text-slate-700">Remoto</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer">
                    <input type="checkbox" checked={prefs.prefersFlexible} onChange={e => setPrefs({...prefs, prefersFlexible: e.target.checked})} className="accent-blue-600" />
                    <span className="text-xs font-black text-slate-700">Flexible</span>
                  </label>
                </div>
              </section>
              <div className="grid grid-cols-2 gap-6">
                <select value={prefs.preferredLocation} onChange={e => setPrefs({...prefs, preferredLocation: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 font-black text-slate-700 outline-none">
                  <option value="Remoto">Todo Argentina</option>
                  <option value="CABA">CABA</option>
                  <option value="GBA">GBA</option>
                  <option value="Cordoba">Córdoba</option>
                </select>
                <select value={prefs.employmentType} onChange={e => setPrefs({...prefs, employmentType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 font-black text-slate-700 outline-none">
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
            </div>
            <button onClick={startAnalysis} className="w-full mt-12 bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-900/20 transition-all active:scale-95">
              Confirmar y Analizar
            </button>
          </div>
        ) : status === 'analyzing' ? (
          <div className="max-w-2xl mx-auto text-center py-32 space-y-12">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
              <div className="relative bg-white p-12 rounded-[3rem] shadow-2xl animate-bounce">
                <Sparkles className="w-24 h-24 text-blue-600" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-slate-900">IA en Proceso</h2>
              <p className="text-xl text-slate-400 font-bold tracking-tight">Estamos validando tu perfil contra 100+ métricas de mercado.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex items-center justify-between pb-8 border-b border-slate-100">
               <h2 className="text-4xl font-black text-slate-900">Tu Informe</h2>
               <div className="flex gap-4">
                  <button onClick={() => setStatus('history')} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all">Ver Historial</button>
                  <button onClick={() => setStatus('idle')} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-all">Subir otro CV</button>
               </div>
            </div>
            {result && <Dashboard data={result} matches={matches} isLoadingMatches={isLoadingMatches} userName={fileData?.name.split('.')[0]} hasDisabilityCertificate={prefs.hasDisabilityCertificate} />}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
