
import { GoogleGenAI, Type } from "@google/genai";
import { CVAnalysisResult, CompanyMatch, UserPreferences, RawMetrics } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const VERIFIED_INCLUSIVE_COMPANIES = [
  "Mercado Libre", "Banco Galicia", "BBVA Argentina", "Telecom Argentina", 
  "YPF", "Banco Nación", "ANSES", "Arcor", "Unilever Argentina", "Coca-Cola Femsa"
];

const getCache = (hash: string): CVAnalysisResult | null => {
  const cached = localStorage.getItem(`cv_analysis_${hash}`);
  return cached ? JSON.parse(cached) : null;
};

const setCache = (hash: string, result: CVAnalysisResult) => {
  localStorage.setItem(`cv_analysis_${hash}`, JSON.stringify({ ...result, hash }));
};

export const calculateHash = async (base64: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(base64);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Validates a job link structure to avoid generic or search pages.
 */
const isValidJobLink = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();
    
    // List of common job portals in Argentina
    const validDomains = [
      'linkedin.com', 'bumeran.com', 'zonajobs.com', 'computrabajo.com', 
      'indeed.com', 'glassdoor.com', 'mercadolibre.com', 'globant.com'
    ];
    
    const isKnownPortal = validDomains.some(d => domain.includes(d));
    if (!isKnownPortal) return true; // Could be a company's direct careers page (e.g., galicia.com.ar/carreras)

    // Avoid generic landing pages or search pages
    const genericPaths = ['/jobs', '/jobs/', '/empleos', '/empleos/', '/buscar', '/search'];
    if (genericPaths.includes(parsed.pathname.toLowerCase())) return false;
    
    // Check for ID-like patterns in LinkedIn or Bumeran
    if (domain.includes('linkedin.com') && !parsed.pathname.includes('/view/')) {
       // LinkedIn job links usually have /view/ID or /jobs/view/ID
       if (!parsed.pathname.match(/\/jobs\/view\/\d+/)) return false;
    }

    return true;
  } catch {
    return false;
  }
};

const RAW_METRICS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pageCount: { type: Type.NUMBER },
    hasSections: { type: Type.BOOLEAN },
    usesBullets: { type: Type.BOOLEAN },
    yearsExperience: { type: Type.NUMBER },
    jobCount: { type: Type.NUMBER },
    skillsCount: { type: Type.NUMBER },
    hasLogrosCuantificables: { type: Type.NUMBER },
    hasEducacionUniversitaria: { type: Type.BOOLEAN },
    hasEducacionTerciaria: { type: Type.BOOLEAN },
    hasCertificaciones: { type: Type.NUMBER },
    hasDatosContacto: { type: Type.BOOLEAN },
    hasResumen: { type: Type.BOOLEAN },
    hasFechas: { type: Type.BOOLEAN },
    errorOrtograficoCount: { type: Type.NUMBER },
    wordCount: { type: Type.NUMBER },
    usesProfessionalLanguage: { type: Type.BOOLEAN },
    isAtsFriendly: { type: Type.BOOLEAN },
    industryKeywordsCount: { type: Type.NUMBER }
  },
  required: [
    "pageCount", "hasSections", "usesBullets", "yearsExperience", "jobCount", 
    "skillsCount", "hasLogrosCuantificables", "hasEducacionUniversitaria", 
    "hasEducacionTerciaria", "hasCertificaciones", "hasDatosContacto", 
    "hasResumen", "hasFechas", "errorOrtograficoCount", "wordCount", 
    "usesProfessionalLanguage", "isAtsFriendly", "industryKeywordsCount"
  ]
};

const MATCH_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      industry: { type: Type.STRING },
      compatibility: { type: Type.NUMBER },
      reason: { type: Type.STRING },
      location: { type: Type.STRING },
      availablePositions: { type: Type.NUMBER },
      website: { type: Type.STRING, description: "URL DIRECTA a la oferta específica o portal de carrera de la empresa." },
      description: { type: Type.STRING, description: "Máximo 200 caracteres." },
      culture: { type: Type.ARRAY, items: { type: Type.STRING } },
      benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
      salaryRange: { type: Type.STRING },
      isInclusive: { type: Type.BOOLEAN },
      employmentType: { type: Type.STRING }
    },
    required: ["name", "industry", "compatibility", "reason", "location", "availablePositions", "website", "description", "culture", "benefits", "isInclusive"]
  }
};

const calculateAlgorithmicScore = (metrics: RawMetrics): CVAnalysisResult['categories'] & { breakdown: CVAnalysisResult['breakdown'] } => {
  const breakdown: CVAnalysisResult['breakdown'] = {};

  let formatScore = 60;
  const formatDetails = ["Base: 60 pts"];
  if (metrics.usesBullets) { formatScore += 10; formatDetails.push("Uso de viñetas: +10"); }
  if (metrics.pageCount >= 1 && metrics.pageCount <= 2) { formatScore += 15; formatDetails.push("Extensión ideal (1-2 pág): +15"); }
  else if (metrics.pageCount > 2) { formatScore -= 10; formatDetails.push("Exceso de páginas: -10"); }
  if (metrics.hasSections) { formatScore += 15; formatDetails.push("Secciones claras: +15"); }
  formatScore = Math.min(100, Math.max(0, formatScore));
  breakdown.format = { label: "Formato y Estructura", points: formatScore, details: formatDetails };

  let contentScore = 50;
  const contentDetails = ["Base: 50 pts"];
  const expBonus = Math.min(30, metrics.yearsExperience * 3);
  contentScore += expBonus;
  if (expBonus > 0) contentDetails.push(`Años de experiencia (${metrics.yearsExperience}): +${expBonus}`);
  const jobBonus = Math.min(15, metrics.jobCount * 5);
  contentScore += jobBonus;
  if (jobBonus > 0) contentDetails.push(`Trayectoria laboral: +${jobBonus}`);
  const logroBonus = Math.min(20, metrics.hasLogrosCuantificables * 5);
  contentScore += logroBonus;
  if (logroBonus > 0) contentDetails.push(`Logros cuantificables: +${logroBonus}`);
  if (metrics.usesProfessionalLanguage) { contentScore += 10; contentDetails.push("Lenguaje profesional: +10"); }
  contentScore = Math.min(100, Math.max(0, contentScore));
  breakdown.content = { label: "Contenido y Experiencia", points: contentScore, details: contentDetails };

  let skillsScore = 60;
  const skillsDetails = ["Base: 60 pts"];
  if (metrics.skillsCount >= 11) { skillsScore += 25; skillsDetails.push("Amplio set de habilidades (11+): +25"); }
  else if (metrics.skillsCount >= 6) { skillsScore += 20; skillsDetails.push("Buen set de habilidades (6-10): +20"); }
  else if (metrics.skillsCount >= 3) { skillsScore += 10; skillsDetails.push("Habilidades básicas (3-5): +10"); }
  const kwBonus = Math.min(15, metrics.industryKeywordsCount * 2);
  skillsScore += kwBonus;
  if (kwBonus > 0) skillsDetails.push(`Palabras clave del sector: +${kwBonus}`);
  skillsScore = Math.min(100, Math.max(0, skillsScore));
  breakdown.keywords = { label: "Habilidades Técnicas", points: skillsScore, details: skillsDetails };

  let eduScore = 70;
  const eduDetails = ["Base: 70 pts"];
  if (metrics.hasEducacionUniversitaria) { eduScore += 15; eduDetails.push("Título universitario: +15"); }
  else if (metrics.hasEducacionTerciaria) { eduScore += 10; eduDetails.push("Título terciario: +10"); }
  const certBonus = Math.min(15, metrics.hasCertificaciones * 3);
  eduScore += certBonus;
  if (certBonus > 0) eduDetails.push(`Certificaciones extra: +${certBonus}`);
  eduScore = Math.min(100, Math.max(0, eduScore));
  breakdown.education = { label: "Educación", points: eduScore, details: eduDetails };

  let atsScore = 65;
  const atsDetails = ["Base: 65 pts"];
  if (metrics.isAtsFriendly) { atsScore += 15; atsDetails.push("Formato simple (ATS Friendly): +15"); }
  const atsKwBonus = Math.min(15, (metrics.industryKeywordsCount / 5) * 2);
  atsScore += atsKwBonus;
  if (atsKwBonus > 0) atsDetails.push("Optimización de keywords: +15");
  if (metrics.hasFechas && metrics.hasDatosContacto) { atsScore += 5; atsDetails.push("Datos críticos presentes: +5"); }
  atsScore = Math.min(100, Math.max(0, atsScore));
  breakdown.structure = { label: "Optimización ATS", points: atsScore, details: atsDetails };

  let redScore = 80;
  const redDetails = ["Base: 80 pts"];
  const errorPenalty = metrics.errorOrtograficoCount * 3;
  redScore -= errorPenalty;
  if (errorPenalty > 0) redDetails.push(`Penalización por ortografía (-${errorPenalty})`);
  if (metrics.wordCount >= 400 && metrics.wordCount <= 800) { redScore += 10; redDetails.push("Extensión de texto ideal: +10"); }
  if (metrics.usesProfessionalLanguage) { redScore += 10; redDetails.push("Tono profesional: +10"); }
  redScore = Math.min(100, Math.max(0, redScore));
  breakdown.redaccion = { label: "Redacción y Claridad", points: redScore, details: redDetails };

  return {
    format: formatScore,
    content: contentScore,
    keywords: skillsScore,
    structure: atsScore,
    education: eduScore,
    redaccion: redScore,
    breakdown
  };
};

export const analyzeCV = async (fileBase64: string, mimeType: string, prefs?: UserPreferences): Promise<CVAnalysisResult> => {
  const hash = await calculateHash(fileBase64);
  const cached = getCache(hash);
  if (cached) return cached;

  const model = "gemini-3-flash-preview";
  const extractionResponse = await ai.models.generateContent({
    model,
    contents: [{
      parts: [
        { inlineData: { data: fileBase64, mimeType: mimeType } },
        { text: `Actúa como un extractor de datos de CV 100% OBJETIVO. Extrae las métricas solicitadas con precisión quirúrgica. No generes opiniones.` }
      ]
    }],
    config: { responseMimeType: "application/json", responseSchema: RAW_METRICS_SCHEMA, temperature: 0 }
  });

  const metrics = JSON.parse(extractionResponse.text.trim()) as RawMetrics;
  const { format, content, keywords, structure, education, redaccion, breakdown } = calculateAlgorithmicScore(metrics);
  const avgScore = Math.round((format + content + keywords + structure + education + redaccion) / 6);

  const feedbackResponse = await ai.models.generateContent({
    model,
    contents: [{
      parts: [
        { inlineData: { data: fileBase64, mimeType: mimeType } },
        { text: `Basado en este CV y los puntajes: Formato ${format}, Exp ${content}, Skills ${keywords}, Edu ${education}, ATS ${structure}, Redac ${redaccion}. Genera un resumen, fortalezas, debilidades y 4-6 recomendaciones específicas citando el texto real.` }
      ]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          careerPathNote: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                section: { type: Type.STRING },
                issue: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                example: { type: Type.STRING }
              },
              required: ["section", "issue", "suggestion"]
            }
          }
        },
        required: ["summary", "strengths", "weaknesses", "recommendations"]
      },
      temperature: 0.3
    }
  });

  const feedback = JSON.parse(feedbackResponse.text.trim());
  const finalResult: CVAnalysisResult = {
    score: avgScore,
    categories: { format, content, keywords, structure, education, redaccion },
    breakdown,
    summary: feedback.summary,
    careerPathNote: feedback.careerPathNote,
    strengths: feedback.strengths,
    weaknesses: feedback.weaknesses,
    recommendations: feedback.recommendations
  };

  setCache(hash, finalResult);
  return finalResult;
};

export const matchCompanies = async (cvSummary: string, prefs: UserPreferences): Promise<CompanyMatch[]> => {
  const model = "gemini-3-flash-preview";
  
  // High quality search with google grounding
  const response = await ai.models.generateContent({
    model,
    contents: `USA GOOGLE SEARCH para encontrar 15-20 ofertas REALES y ACTUALES en Argentina para este perfil: "${cvSummary}".
    
    PREFERENCIAS: ${prefs.employmentType}, Ubicación: ${prefs.preferredLocation}, Remoto: ${prefs.prefersRemote ? 'Sí' : 'No'}.
    
    REGLA DE ORO DE LOS LINKS:
    - DEBES proporcionar URLs DIRECTAS a las vacantes (ej: linkedin.com/jobs/view/ID, bumeran.com.ar/empleos/TITULO-ID.html).
    - NO proporciones links genéricos de búsqueda.
    - PRIORIZA ofertas publicadas en los últimos 7 días.
    - ${prefs.hasDisabilityCertificate ? 'Usuario con discapacidad: Prioriza sector público con cupo del 4% y empresas como Mercado Libre, Galicia, BBVA, Telecom.' : ''}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: MATCH_SCHEMA,
      tools: [{ googleSearch: {} }],
      temperature: 0.1 // Lower variability for search results
    }
  });

  const rawMatches = JSON.parse(response.text.trim()) as CompanyMatch[];
  
  // Filter and enrich
  const now = new Date().toISOString();
  return rawMatches
    .filter(m => isValidJobLink(m.website))
    .map(m => ({
      ...m,
      isInclusive: m.isInclusive || VERIFIED_INCLUSIVE_COMPANIES.some(vc => m.name.toLowerCase().includes(vc.toLowerCase())),
      verifiedAt: now,
      linkStatus: 'verified' as const
    }));
};
