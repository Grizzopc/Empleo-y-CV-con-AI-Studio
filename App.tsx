
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import { analyzeCV, matchCompanies } from './services/geminiService';
import { CVAnalysisResult, CompanyMatch, AnalysisStatus, UserPreferences } from './types';
import { Upload, FileText, Sparkles, AlertCircle, Info, Search } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [fileData, setFileData] = useState<{ base64: string; type: string; name: string } | null>(null);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo es demasiado grande (máximo 5MB).");
      return;
    }

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
      const analysisResult = await analyzeCV(fileData.base64, fileData.type, prefs);
      setResult(analysisResult);
      setStatus('completed');
      
      setIsLoadingMatches(true);
      const companyMatches = await matchCompanies(analysisResult.summary, prefs);
      setMatches(companyMatches);
      setIsLoadingMatches(false);
    } catch (err: any) {
      setError(err.message || "Error al analizar el CV.");
      setStatus('error');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {status === 'idle' || status === 'error' ? (
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" /> IA Optimizadora
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
              Análisis justo de tu CV para el mercado <span className="text-blue-600 underline decoration-blue-200">Argentino</span>.
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              Recibí un puntaje realista y encontrá empresas que valoran tu trayectoria actual.
            </p>

            <div className="relative group max-w-xl mx-auto">
              <label className="flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-slate-300 rounded-[3rem] bg-white hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer shadow-2xl shadow-blue-900/5 group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="bg-blue-600 p-5 rounded-[1.5rem] shadow-lg mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <p className="mb-2 text-xl font-black text-slate-900">Subí tu currículum</p>
                  <p className="text-sm text-slate-500 font-medium">PDF o DOCX (Máximo 5MB)</p>
                </div>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
              </label>
              {error && (
                <div className="mt-6 flex items-center gap-3 text-red-600 text-sm font-bold bg-red-50 p-4 rounded-2xl border border-red-100">
                  <AlertCircle className="w-5 h-5" /> {error}
                </div>
              )}
            </div>
          </div>
        ) : status === 'preferences' ? (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Personalizá tu búsqueda</h2>
            <p className="text-slate-500 mb-8 font-medium">Ayudanos a filtrar las mejores vacantes.</p>
            
            <div className="space-y-8">
              <section className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <label className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-400 transition-colors mb-6">
                  <input 
                    type="checkbox" 
                    checked={prefs.hasDisabilityCertificate}
                    onChange={e => setPrefs({...prefs, hasDisabilityCertificate: e.target.checked})}
                    className="w-5 h-5 rounded accent-blue-600"
                  />
                  <span className="font-bold text-slate-700">Tengo certificado de discapacidad (CUD)</span>
                </label>

                {prefs.hasDisabilityCertificate && (
                  <div className="bg-blue-50 p-4 rounded-2xl text-blue-800 text-xs font-medium mb-6">
                    <Info className="w-4 h-4 inline mr-2" />
                    Te mostraremos información honesta sobre cupos de ley y empresas inclusivas.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer">
                    <input type="checkbox" checked={prefs.prefersRemote} onChange={e => setPrefs({...prefs, prefersRemote: e.target.checked})} className="accent-blue-600" />
                    <span className="text-xs font-bold text-slate-700">Home Office</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer">
                    <input type="checkbox" checked={prefs.prefersFlexible} onChange={e => setPrefs({...prefs, prefersFlexible: e.target.checked})} className="accent-blue-600" />
                    <span className="text-xs font-bold text-slate-700">Horarios Flexibles</span>
                  </label>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Ubicación</label>
                  <select value={prefs.preferredLocation} onChange={e => setPrefs({...prefs, preferredLocation: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-black text-slate-700 outline-none">
                    <option value="Remoto">Todo Argentina / Remoto</option>
                    <option value="CABA">CABA</option>
                    <option value="GBA">GBA</option>
                    <option value="Cordoba">Córdoba</option>
                    <option value="Rosario">Rosario</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Tipo Empleo</label>
                  <select value={prefs.employmentType} onChange={e => setPrefs({...prefs, employmentType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-black text-slate-700 outline-none">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={startAnalysis} className="w-full mt-10 bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-blue-700 shadow-2xl transition-all">
              Comenzar Análisis
            </button>
          </div>
        ) : status === 'analyzing' ? (
          <div className="max-w-2xl mx-auto text-center py-24">
            <div className="relative inline-block mb-12">
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative bg-white p-10 rounded-full shadow-2xl animate-bounce">
                <FileText className="w-20 h-20 text-blue-600" />
              </div>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Analizando con precisión...</h2>
            <p className="text-slate-500 font-bold">Buscando el mejor match para tu trayectoria.</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-10 pb-8 border-b border-slate-200">
              <h2 className="text-4xl font-black text-slate-900">Resultados del Análisis</h2>
              <button onClick={() => setStatus('idle')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-500 hover:text-blue-600 transition-all">Subir otro CV</button>
            </div>
            {result && <Dashboard data={result} matches={matches} isLoadingMatches={isLoadingMatches} userName={fileData?.name.split('.')[0]} hasDisabilityCertificate={prefs.hasDisabilityCertificate} />}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
