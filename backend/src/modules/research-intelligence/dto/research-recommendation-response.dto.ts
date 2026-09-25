export class ScoreBreakdownDto {
  semantic: number;
  keyword: number;
  domain: number;
  recency?: number;
  citation?: number;
  geographic?: number;
}

export class PaperRecommendationDto {
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
  scoreBreakdown: ScoreBreakdownDto;
}

export class DatasetRecommendationDto {
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
  scoreBreakdown: ScoreBreakdownDto;
}

export class ResearchIntelligenceResponseDto {
  challengeId: string;
  papers: PaperRecommendationDto[];
  datasets: DatasetRecommendationDto[];
  computedAt: string;
  status: 'available' | 'unavailable' | 'empty';
  cached: boolean;
  message?: string;
}
