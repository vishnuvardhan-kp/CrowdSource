export interface ScoreBreakdown {
  semantic: number;
  keyword: number;
  domain: number;
  recency?: number;
  citation?: number;
  geographic?: number;
}

export interface PaperRecommendation {
  id: number;
  title: string;
  abstract: string | null;
  authors: string[];
  publicationYear: number | null;
  venue: string | null;
  doi: string | null;
  paperUrl: string | null;
  publisherUrl: string | null;
  openAccessUrl: string | null;
  pdfUrl: string | null;
  isOpenAccess: boolean;
  citationCount: number;
  keywords: string[];
  domain: string | null;
  relevanceScore: number;
  retrievalScore: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface DatasetRecommendation {
  id: number;
  title: string;
  name: string;
  description: string | null;
  domain: string | null;
  keywords: string[];
  features: string[];
  geographicScope: string | null;
  sizeDescription: string | null;
  format: string | null;
  license: string | null;
  sourceUrl: string | null;
  accessUrl: string | null;
  landingPage: string | null;
  downloadUrl: string | null;
  relevanceScore: number;
  retrievalScore: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface ResearchIntelligenceData {
  challengeId: string;
  papers: PaperRecommendation[];
  datasets: DatasetRecommendation[];
  computedAt: string;
  status: 'available' | 'unavailable' | 'empty';
  cached: boolean;
  message?: string;
}

export async function fetchResearchIntelligence(
  challengeId: string,
  token?: string | null,
): Promise<ResearchIntelligenceData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${apiUrl}/v1/research-intelligence/challenges/${challengeId}`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch research intelligence: HTTP ${res.status}`);
  }

  return res.json();
}
