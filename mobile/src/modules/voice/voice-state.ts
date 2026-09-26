import {
  DistrictItem,
  BlockItem,
  SamadhanSeverity,
  VoiceAnalysisResult,
  VoiceTurnResponse,
  VoiceConversationState,
} from './voice-types';

const TAMIL_DISTRICT_MAP: Record<string, string> = {
  'ராஞ்சி': 'Ranchi', 'ரான்சி': 'Ranchi', 'ராஞ்சிங்கிற': 'Ranchi', 'ராஞ்சங்கர்': 'Ranchi', 'ராஞ்சில': 'Ranchi', 'ராஞ்சியில்': 'Ranchi', 'ராஞ்ச': 'Ranchi',
  'தன்பாத்': 'Dhanbad', 'தான்பாத்': 'Dhanbad',
  'பொகாரோ': 'Bokaro', 'போகாரோ': 'Bokaro',
  'கிழக்கு சிங்பூம்': 'East Singhbhum', 'சிங்பூம்': 'East Singhbhum',
  'மேற்கு சிங்பூம்': 'West Singhbhum',
  'ஹசாரிபாக்': 'Hazaribagh', 'ஹசாரிபாஹ்': 'Hazaribagh',
  'தியோகர்': 'Deoghar', 'தேவ்கர்': 'Deoghar',
  'கிரிதி': 'Giridih',
  'ராம்கர்': 'Ramgarh', 'ராம்கட்': 'Ramgarh',
  'தும்கா': 'Dumka',
  'கோடா': 'Godda',
  'கும்லா': 'Gumla',
  'சத்ரா': 'Chatra',
  'கட்வா': 'Garhwa', 'கர்வாவ்': 'Garhwa',
  'ஜாம்தாரா': 'Jamtara',
  'குந்தி': 'Khunti',
  'கோடெர்மா': 'Koderma', 'கோடர்மா': 'Koderma',
  'லாதேஹார்': 'Latehar',
  'லோஹர்டகா': 'Lohardaga',
  'பாகுர்': 'Pakur',
  'பாலாமு': 'Palamu',
  'சாகிப்கஞ்ச்': 'Sahibganj',
  'சராய்கேலா': 'Saraikela Kharsawan', 'சராய்கேலா கார்சாவான்': 'Saraikela Kharsawan',
  'சிம்டேகா': 'Simdega',
};

const TAMIL_BLOCK_MAP: Record<string, string> = {
  'தாமர்': 'Tamar', 'தமர்': 'Tamar', 'தமாரு': 'Tamar', 'தமார்': 'Tamar', 'தமாருங்கிற': 'Tamar', 'தமர்ங்கிற': 'Tamar', 'தமரில்': 'Tamar',
  'காங்கே': 'Kanke', 'கான்கே': 'Kanke', 'காங்கேங்கிற': 'Kanke',
  'நம்கும்': 'Namkum', 'நம்கூம்': 'Namkum',
  'பெரோ': 'Bero',
  'ஓர்மஞ்சி': 'Ormanjhi',
  'ராது': 'Ratu',
  'சில்லில': 'Silli', 'சில்லி': 'Silli',
  'சோனஹாது': 'Sonahatu',
  'புண்டு': 'Bundu',
  'இட்கி': 'Itki',
  'அனகரா': 'Angara',
  'சாஹோ': 'Chanho', 'சான்ஹோ': 'Chanho',
  'புர்மூ': 'Burmu',
  'லாபுங்': 'Lapung',
  'மந்தர்': 'Mandar',
  'கல்கலியா': 'Khalari', 'கலாரி': 'Khalari',
  'பெர்மோ': 'Bermo',
  'சாஸ்': 'Chas',
  'கோவிந்த்பூர்': 'Govindpur',
  'ஜாரியா': 'Jharia',
  'நாக்ரி': 'Nagri', 'நகரி': 'Nagri',
};

function cleanLocationSuffix(name?: string | null): string {
  if (!name) return '';
  return name
    .replace(/\b(district|dist|zilla|zila|jila|block|constituency|panchayat|village|ward|taluk|tehsil|mandal)\b/gi, '')
    .replace(/(டிஸ்ட்ரிக்ட்ல|டிஸ்ட்ரிக்ட்|டிஸ்ட்ரிக்|மாவட்டத்துல|மாவட்டத்தில்|மாவட்டம்|மாவட்ட|வட்டாரத்தில்|வட்டாரத்துல|வட்டாரம்|வட்டம்|வார்டுல|வார்டில்|வார்டு|தொகுதியில்|தொகுதி|கிராமத்தில்|கிராமம்|ஊர்|தாலுகா|பகுதியில்|பகுதி|இடத்துல|இடத்தில்|பிளாக்கில்|பிளாக்ல|பிளாக்|ப்ளாக்)/g, '')
    .replace(/(ங்கிற|ங்கற|என்ற|என்கிற|இருக்கிறேன்|இருக்கிறோம்|இருக்கோம்|நாங்கள்|நான்|நாங்க|அப்புறம்|மற்றும்)/g, '')
    .replace(/(जिला|वार्ड|प्रखंड|तहसील|पंचायत|गाँव|गांव|तालुक)/g, '')
    .trim();
}

/**
 * Matches an extracted district name against available database districts.
 * Supports English, Hindi, and Tamil names.
 * CRITICAL RULE: Never falls back to districts[0]. If unmatched, returns null.
 */
export function matchDistrictName(
  districtName: string | null | undefined,
  districts: DistrictItem[],
): string | null {
  if (!districtName || !districts || districts.length === 0) {
    return null;
  }

  const cleaned = cleanLocationSuffix(districtName) || districtName.trim();
  let normalized = cleaned;
  if (TAMIL_DISTRICT_MAP[cleaned]) {
    normalized = TAMIL_DISTRICT_MAP[cleaned];
  } else {
    for (const [ta, en] of Object.entries(TAMIL_DISTRICT_MAP)) {
      if (cleaned.includes(ta) || districtName.includes(ta)) {
        normalized = en;
        break;
      }
    }
  }

  const dLower = normalized.toLowerCase().trim();
  const match = districts.find(
    (d) =>
      d.name.toLowerCase() === dLower ||
      dLower.includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(dLower) ||
      districtName.toLowerCase().includes(d.name.toLowerCase()),
  );

  return match ? match.id : null;
}

/**
 * Matches an extracted block name against available database blocks.
 * Supports English, Hindi, and Tamil names.
 * CRITICAL RULE: Never falls back to blocks[0]. If unmatched, returns null.
 */
export function matchBlockName(
  blockName: string | null | undefined,
  blocks: BlockItem[],
): string | null {
  if (!blockName || !blocks || blocks.length === 0) {
    return null;
  }

  const cleaned = cleanLocationSuffix(blockName) || blockName.trim();
  let normalized = cleaned;
  if (TAMIL_BLOCK_MAP[cleaned]) {
    normalized = TAMIL_BLOCK_MAP[cleaned];
  } else {
    for (const [ta, en] of Object.entries(TAMIL_BLOCK_MAP)) {
      if (cleaned.includes(ta) || blockName.includes(ta)) {
        normalized = en;
        break;
      }
    }
  }

  const bLower = normalized.toLowerCase().trim();
  const match = blocks.find(
    (b) =>
      b.name.toLowerCase() === bLower ||
      bLower.includes(b.name.toLowerCase()) ||
      b.name.toLowerCase().includes(bLower) ||
      blockName.toLowerCase().includes(b.name.toLowerCase()),
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
  if (!districtId && stt.originalTranscript) {
    districtId = matchDistrictName(stt.originalTranscript, districts);
  }

  // Resolve block ID
  const blockId = llama.blockId || previousAnalysis?.blockId || null;
  const blockName = llama.blockName || previousAnalysis?.blockName || null;

  // Problem statement & title: Preserve previous turn's detailed problem statement
  const cleanProblemStatement =
    previousAnalysis?.problem_statement ||
    previousAnalysis?.description ||
    llama.problem_statement ||
    llama.problem ||
    '';

  const cleanTitle =
    previousAnalysis?.title ||
    llama.title ||
    (cleanProblemStatement.length > 60
      ? cleanProblemStatement.slice(0, 57) + '...'
      : cleanProblemStatement);

  // Preserve domain & sub-domain without hardcoded defaults
  const domain = llama.domain ?? previousAnalysis?.domain ?? null;
  const subDomain = llama.subDomain ?? previousAnalysis?.subDomain ?? null;

  // If domain is unknown, requiresReview is flagged
  const requiresReview =
    llama.requiresReview || (!domain && !previousAnalysis?.domain);

  // Preserve severity without fabricating citizen claims
  const citizenSeverity =
    previousAnalysis?.citizen_severity || SamadhanSeverity.MODERATE;

  // Accurate completeness check: if districtId is resolved, isDistrictMissing is false
  const isDistrictMissing = !districtId;
  const isConstituencyMissing = !blockId && llama.isConstituencyMissing;
  const isComplete = !isDistrictMissing && !isConstituencyMissing;

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

    isDistrictMissing,
    isConstituencyMissing,
    isComplete,

    followUpQuestion: isComplete ? null : llama.followUpQuestion,
  };
}
