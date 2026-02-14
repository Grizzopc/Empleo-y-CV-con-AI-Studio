
export interface CVAnalysisResult {
  score: number;
  categories: {
    format: number;
    content: number;
    keywords: number;
    structure: number;
    education: number;
    redaccion: number;
  };
  breakdown: {
    [key: string]: {
      label: string;
      points: number;
      details: string[];
    };
  };
  summary: string;
  careerPathNote?: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  hash?: string;
}

export interface RawMetrics {
  pageCount: number;
  hasSections: boolean;
  usesBullets: boolean;
  yearsExperience: number;
  jobCount: number;
  skillsCount: number;
  hasLogrosCuantificables: number; // count
  hasEducacionUniversitaria: boolean;
  hasEducacionTerciaria: boolean;
  hasCertificaciones: number; // count
  hasDatosContacto: boolean;
  hasResumen: boolean;
  hasFechas: boolean;
  errorOrtograficoCount: number;
  wordCount: number;
  usesProfessionalLanguage: boolean;
  isAtsFriendly: boolean; // format simple
  industryKeywordsCount: number;
}

export interface Recommendation {
  section: string;
  issue: string;
  suggestion: string;
  example?: string;
}

export interface CompanyMatch {
  name: string;
  industry: string;
  compatibility: number;
  reason: string;
  location: string;
  availablePositions: number;
  website: string; // This should be the direct job link
  description: string;
  culture: string[];
  benefits: string[];
  salaryRange?: string;
  isInclusive: boolean;
  employmentType?: string;
  verifiedAt?: string; // ISO date
  linkStatus?: 'verified' | 'unverified' | 'expired';
}

export interface UserPreferences {
  hasDisabilityCertificate: boolean;
  disabilityType?: string;
  adaptationsNeeded?: string;
  prefersRemote: boolean;
  prefersFlexible: boolean;
  prefersReducedHours: boolean;
  prefersInclusiveEnvironment: boolean;
  preferredLocation: string;
  targetSector: string;
  employmentType: string;
}

export type AnalysisStatus = 'idle' | 'preferences' | 'analyzing' | 'completed' | 'error';
