import {
  DistrictItem,
  BlockItem,
  CitizenSeverity,
  VoiceAnalysisResult,
  VoiceTurnResponse,
  VoiceConversationState,
} from './voice-types';

/**
 * Matches an extracted district name against available database districts.
 * CRITICAL RULE: Never falls back to districts[0]. If unmatched, returns null.
 */
export function matchDistrictName(
  districtName: string | null | undefined,
  districts: DistrictItem[],
): string | null {
  if (!districtName || !districts || districts.length === 0) {
    return null;
  }

  const dLower = districtName.toLowerCase().trim();
  const match = districts.find(
    (d) =>
      d.name.toLowerCase() === dLower ||
      dLower.includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(dLower),
  );

  return match ? match.id : null;
}

/**
 * Matches an extracted block name against available database blocks.
 * CRITICAL RULE: Never falls back to blocks[0]. If unmatched, returns null.
 */
export function matchBlockName(
  blockName: string | null | undefined,
  blocks: BlockItem[],
): string | null {
  if (!blockName || !blocks || blocks.length === 0) {
    return null;
  }

  const bLower = blockName.toLowerCase().trim();
  const match = blocks.find(
    (b) =>
      b.name.toLowerCase() === bLower ||
      bLower.includes(b.name.toLowerCase()) ||
      b.name.toLowerCase().includes(bLower),
  );

  return match ? match.id : null;
}

/**
 * Constructs a VoiceConversationState payload from a previous analysis result
 * to be passed to the backend on follow-up turns.
 */
export function toConversationState(
  analysis: VoiceAnalysisResult,
): VoiceConversationState {
  return {
    title: analysis.title,
    problem_statement: analysis.problem_statement || analysis.description,
    problem: analysis.description,
    domain: analysis.domain,
    subDomain: analysis.subDomain,
    districtId: analysis.districtId,
    districtName: analysis.districtName,
    blockId: analysis.blockId,
    blockName: analysis.blockName,
    ward: analysis.ward,
    villageLocality: analysis.villageLocality,
    affectedPopulation: analysis.affectedPopulation,
    location: analysis.location,
    facts: analysis.facts,
    originalTranscript: analysis.originalTranscript,
    englishTranslation: analysis.englishTranslation,
    detectedLanguage: analysis.detectedLanguage,
  };
}

/**
 * Merges turn responses from Llama into an authoritative VoiceAnalysisResult.
 * Strictly adheres to zero hallucination and no fake classification defaults.
 */
export function buildVoiceAnalysisResult(
  llama: VoiceTurnResponse,
  stt: {
    originalTranscript: string;
    detectedLanguage: string;
    languageName: string;
    englishTranslation: string;
  },
  districts: DistrictItem[],
  previousAnalysis?: VoiceAnalysisResult | null,
): VoiceAnalysisResult {
  // Resolve district ID
  let districtId = llama.districtId || previousAnalysis?.districtId || null;
  const districtName = llama.districtName || previousAnalysis?.districtName || null;

  if (!districtId && districtName) {
    districtId = matchDistrictName(districtName, districts);
  }

  // Resolve block ID
  const blockId = llama.blockId || previousAnalysis?.blockId || null;
  const blockName = llama.blockName || previousAnalysis?.blockName || null;

  // Problem statement & title
  const cleanProblemStatement =
    llama.problem_statement ||
    llama.problem ||
    previousAnalysis?.problem_statement ||
    previousAnalysis?.description ||
    '';

  const cleanTitle =
    llama.title ||
    previousAnalysis?.title ||
    (cleanProblemStatement.length > 60
      ? cleanProblemStatement.slice(0, 57) + '...'
      : cleanProblemStatement);

  // Preserve domain & sub-domain without hardcoded defaults
  const domain = llama.domain || previousAnalysis?.domain || null;
  const subDomain = llama.subDomain || previousAnalysis?.subDomain || null;

  // If domain is unknown, requiresReview is flagged
  const requiresReview =
    llama.requiresReview || (!domain && !previousAnalysis?.domain);

  // Preserve severity without fabricating citizen claims
  const citizenSeverity =
    previousAnalysis?.citizen_severity || CitizenSeverity.MODERATE;

  return {
    originalTranscript: stt.originalTranscript,
    detectedLanguage: stt.detectedLanguage,
    languageName: stt.languageName,
    englishTranslation: stt.englishTranslation,

    title: cleanTitle,
    problem_statement: cleanProblemStatement,
    description: cleanProblemStatement,

    domain,
    subDomain,
    category: domain || previousAnalysis?.category || null,

    citizen_severity: citizenSeverity,

    districtId,
    districtName,

    blockId,
    blockName,

    ward: llama.ward || previousAnalysis?.ward || null,
    villageLocality: llama.villageLocality || previousAnalysis?.villageLocality || null,

    affectedPopulation: llama.affectedPopulation || previousAnalysis?.affectedPopulation || null,

    location: llama.location || previousAnalysis?.location || null,
    facts: llama.facts || previousAnalysis?.facts || null,

    missingRequiredFields: llama.missingRequiredFields || [],
    requiresReview,

    isDistrictMissing: llama.isDistrictMissing,
    isConstituencyMissing: llama.isConstituencyMissing,
    isComplete: llama.isComplete,

    followUpQuestion: llama.followUpQuestion,
  };
}
