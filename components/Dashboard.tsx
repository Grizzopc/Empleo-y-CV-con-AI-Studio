
import React, { useState, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { CVAnalysisResult, CompanyMatch } from '../types';
import { 
  CheckCircle2, Building2, Lightbulb, ExternalLink, 
  MapPin, Briefcase, ChevronDown, ChevronUp, Download, 
  Users, DollarSign, Info, ShieldCheck, HelpCircle, Calendar, AlertTriangle, Search
} from 'lucide-react';
import { generatePDFReport } from './ReportGenerator';
import { VERIFIED_INCLUSIVE_COMPANIES } from '../services/geminiService';

interface DashboardProps {
  data: CVAnalysisResult;
  matches: CompanyMatch[];
  isLoadingMatches: boolean;
  userName?: string;
  hasDisabilityCertificate?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ data, matches, isLoadingMatches, userName = 'Usuario', hasDisabilityCertificate }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterSector, setFilterSector] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [sortBy, setSortBy] = useState('match');
  const [visibleCount, setVisibleCount] = useState(6);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [reportedLinks, setReportedLinks] = useState<Set<number>>(new Set());

  const sectors = useMemo(() => ['All', ...new Set(matches.map(m => m.industry))], [matches]);
  const locations = useMemo(() => ['All', 'CABA', 'GBA', 'Cordoba', 'Rosario', 'Remoto', 'Mendoza'], []);

  const filteredMatches = useMemo(() => {
    return matches
      .filter(m => filterSector === 'All' || m.industry === filterSector)
      .filter(m => {
        if (filterLocation === 'All') return true;
        return m.location.toLowerCase().includes(filterLocation.toLowerCase());
      })
      .sort((a, b) => {
        if (sortBy === 'match') return b.compatibility - a.compatibility;
        return a.name.localeCompare(b.name);
      });
  }, [matches, filterSector, filterLocation, sortBy]);

  const getScoreInfo = (score: number) => {
    if (score >= 85) return { color: 'text-emerald-600', msg: '¡Excelente! Tu CV está muy bien posicionado para destacar.' };
    if (score >= 75) return { color: 'text-blue-600', msg: 'Muy buen CV. Con algunos ajustes menores, puede ser excelente.' };
    if (score >= 65) return { color: 'text-amber-500', msg: 'Tu CV tiene buena base. Te sugerimos algunas mejoras para optimizarlo.' };
    if (score >= 60) return { color: 'text-amber-600', msg: 'Tu CV tiene lo esencial. Con las mejoras sugeridas, puede mejorar significativamente.' };
    return { color: 'text-red-500', msg: 'Tu CV necesita reestructuración. Seguí nuestras recomendaciones para mejorarlo.' };
  };

  const scoreInfo = getScoreInfo(data.score);

  const chartData = [
    { subject: 'Formato', A: data.categories.format, fullMark: 100 },
    { subject: 'Contenido', A: data.categories.content, fullMark: 100 },
    { subject: 'Keywords', A: data.categories.keywords, fullMark: 100 },
    { subject: 'ATS', A: data.categories.structure, fullMark: 100 },
    { subject: 'Educación', A: data.categories.education, fullMark: 100 },
    { subject: 'Redacción', A: data.categories.redaccion, fullMark: 100 },
  ];

  const handleReportLink = (id: number) => {
    setReportedLinks(prev => new Set(prev).add(id));
    // Here logic to inform backend/admin about broken link could be added
  };

  const getJobPortalName = (url: string) => {
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('bumeran.com')) return 'Bumeran';
    if (url.includes('zonajobs.com')) return 'ZonaJobs';
    if (url.includes('computrabajo.com')) return 'CompuTrabajo';
    return 'Portal de la Empresa';
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-slate-500 text-sm font-medium">
          Resultados para <span className="text-blue-600 font-bold">{userName}</span> 
          {data.hash && <span className="ml-2 text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400">ID: {data.hash.substring(0,8)}</span>}
        </div>
        <button 
          onClick={() => generatePDFReport(data, matches, userName)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          <Download className="w-5 h-5" /> Descargar Informe Completo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Puntaje Determinístico</span>
          <div className={`text-7xl font-black mb-4 ${scoreInfo.color}`}>
            {data.score}
          </div>
          <p className="text-sm font-bold text-slate-700 leading-tight px-4 mb-4">{scoreInfo.msg}</p>
          <button 
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest"
          >
            <HelpCircle className="w-3 h-3" /> {showBreakdown ? 'Ocultar detalles' : '¿Cómo se calcula?'}
          </button>
        </div>
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Equilibrio de Competencias</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Radar dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showBreakdown && (
        <div className="bg-white border border-blue-100 p-8 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-blue-900/5">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" /> Transparencia de Análisis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(data.breakdown).map(([key, cat]: [string, any]) => (
              <div key={key} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cat.label}</span>
                  <span className="text-sm font-black text-blue-600">{cat.points}/100</span>
                </div>
                <div className="space-y-2">
                  {cat.details.map((d: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-1 h-1 rounded-full bg-blue-400" />
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasDisabilityCertificate && (
        <section className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] space-y-4">
          <div className="flex items-center gap-3 text-emerald-800">
            <ShieldCheck className="w-6 h-6" />
            <h3 className="text-xl font-bold">Búsqueda Inclusiva Honesta</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-emerald-900 leading-relaxed">
            <div>
              <h4 className="font-bold mb-2">✅ Cupo del 4% Ley 25.689:</h4>
              <p>Priorizaremos organismos públicos y bancos, donde el cumplimiento es obligatorio.</p>
            </div>
            <div>
              <h4 className="font-bold mb-2">✅ Empresas con Programas:</h4>
              <p>Mantenemos una lista curada de empresas como {VERIFIED_INCLUSIVE_COMPANIES.slice(0, 4).join(', ')} con iniciativas verificadas.</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
            <h3 className="text-xl font-bold text-slate-900">Fortalezas Identificadas</h3>
          </div>
          <div className="space-y-3">
            {data.strengths.map((s, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-50 flex items-center gap-4 hover:border-emerald-200 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-slate-700 font-medium text-sm">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Lightbulb className="w-5 h-5" /></div>
            <h3 className="text-xl font-bold text-slate-900">Pasos para Mejorar</h3>
          </div>
          <div className="space-y-4">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm hover:shadow-md transition-all">
                <span className="text-[9px] font-black text-blue-600 uppercase mb-1 block">{rec.section}</span>
                <h4 className="font-bold text-slate-900 mb-1">{rec.issue}</h4>
                <p className="text-slate-600 text-xs mb-3">{rec.suggestion}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="pt-12 border-t border-slate-200/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
              Ofertas Reales <Briefcase className="w-6 h-6 text-blue-600" />
            </h3>
            <p className="text-slate-500">Links directos verificados para tu perfil argentino</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold">
              {sectors.map(s => <option key={s} value={s}>{s === 'All' ? 'Sectores' : s}</option>)}
            </select>
            <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold">
              {locations.map(l => <option key={l} value={l}>{l === 'All' ? 'Ubicación' : l}</option>)}
            </select>
          </div>
        </div>

        {isLoadingMatches ? (
          <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400 font-bold uppercase text-xs">Validando links de ofertas...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-amber-50 p-12 rounded-[2.5rem] border border-amber-100 text-center">
             <Search className="w-12 h-12 text-amber-400 mx-auto mb-4" />
             <h4 className="text-xl font-bold text-amber-900 mb-2">No encontramos links directos activos</h4>
             <p className="text-amber-700 mb-6">Las ofertas pueden haber expirado. Probá buscando manualmente:</p>
             <div className="flex flex-wrap justify-center gap-4">
                <a href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(userName || 'trabajo')}`} target="_blank" className="bg-white px-6 py-3 rounded-xl border border-amber-200 text-amber-800 font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors">
                  Buscar en LinkedIn <ExternalLink className="w-4 h-4" />
                </a>
                <a href={`https://www.bumeran.com.ar/empleos-busqueda-${encodeURIComponent(userName || 'trabajo')}.html`} target="_blank" className="bg-white px-6 py-3 rounded-xl border border-amber-200 text-amber-800 font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors">
                  Buscar en Bumeran <ExternalLink className="w-4 h-4" />
                </a>
             </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-blue-50/50 p-4 rounded-2xl flex items-center gap-3 text-blue-700 text-xs font-bold">
               <Info className="w-4 h-4" /> 
               Filtramos links genéricos para mostrarte solo vacantes específicas.
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMatches.slice(0, visibleCount).map((match, i) => (
                <div key={i} className={`bg-white rounded-[2.5rem] shadow-sm border ${reportedLinks.has(i) ? 'opacity-50 grayscale' : expandedId === i ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-100'} hover:shadow-2xl transition-all duration-500 flex flex-col p-8 animate-fade-in`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-slate-50 p-4 rounded-[1.25rem]"><Building2 className="w-8 h-8 text-slate-400" /></div>
                    <div className="text-right">
                      <div className={`text-3xl font-black ${match.compatibility >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{match.compatibility}%</div>
                      {match.isInclusive && <span className="text-[10px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-full">Programa Inclusivo ♿</span>}
                    </div>
                  </div>

                  <h4 className="text-2xl font-black text-slate-900 mb-1 leading-tight">{match.name}</h4>
                  <p className="text-sm text-blue-600 font-bold mb-4 uppercase tracking-wide">{match.industry}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mb-6 font-medium">
                    <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {match.location}</div>
                    <div className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-4 h-4" /> Link Directo</div>
                    {match.verifiedAt && <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Verificado hoy</div>}
                  </div>

                  {expandedId === i && (
                    <div className="mt-2 mb-8 space-y-4 border-t border-slate-100 pt-6 animate-in slide-in-from-top-4">
                      <p className="text-slate-600 text-xs leading-relaxed">{match.description}</p>
                      <div className="bg-slate-50 p-4 rounded-2xl text-[11px] font-medium text-slate-700 italic border border-slate-100">
                         "{match.reason}"
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Origen: {getJobPortalName(match.website)}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex flex-col gap-3">
                    <div className="flex gap-3">
                      <button onClick={() => setExpandedId(expandedId === i ? null : i)} className="flex-1 bg-slate-50 text-slate-700 py-4 rounded-2xl font-bold text-xs hover:bg-slate-100 transition-colors">
                        {expandedId === i ? 'Menos' : 'Detalles'}
                      </button>
                      <a 
                        href={match.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                      >
                        Aplicar ahora <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    {!reportedLinks.has(i) && (
                      <button 
                        onClick={() => handleReportLink(i)} 
                        className="text-[9px] font-bold text-slate-400 hover:text-red-400 transition-colors uppercase flex items-center gap-1 justify-center py-1"
                      >
                        <AlertTriangle className="w-3 h-3" /> Reportar link roto
                      </button>
                    )}
                    {reportedLinks.has(i) && (
                      <span className="text-[9px] font-bold text-red-500 uppercase text-center py-1">Reportado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {visibleCount < filteredMatches.length && (
              <div className="text-center pt-10">
                <button onClick={() => setVisibleCount(v => v + 6)} className="px-12 py-5 bg-white border-2 border-slate-200 rounded-3xl font-black text-slate-600 hover:bg-slate-50 hover:border-blue-400 transition-all shadow-xl">
                  Cargar más ofertas
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

const Globe = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);

export default Dashboard;
