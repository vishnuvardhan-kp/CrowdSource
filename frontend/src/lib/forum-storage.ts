/**
 * ResolvIN - Private Problem Communication Forum
 * Local Storage Persistence Module
 *
 * Dedicated to problem-specific multi-stakeholder communication
 * (Citizen ↔ University ↔ Industry/Collaborator).
 */

export type ForumRole = "CITIZEN" | "UNIVERSITY" | "INDUSTRY" | "ADMIN";

export interface ForumMessage {
  id: string;
  challengeId: string;
  senderId: string;
  senderName: string;
  senderRole: ForumRole;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationType?: string | null;
  message: string;
  timestamp: string;
}

export interface ForumConversation {
  challengeId: string;
  messages: ForumMessage[];
  updatedAt: string;
}

const STORAGE_PREFIX = "samadhanSetu_forum_";

export function getForumStorageKey(challengeId: string): string {
  return `${STORAGE_PREFIX}${challengeId}`;
}

export function getForumMessages(challengeId: string): ForumMessage[] {
  if (typeof window === "undefined" || !challengeId) return [];
  try {
    const raw = localStorage.getItem(getForumStorageKey(challengeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.messages)) {
      return parsed.messages;
    }
    return [];
  } catch (err) {
    console.error(`Failed to read forum messages for challenge ${challengeId}:`, err);
    return [];
  }
}

export function saveForumMessage(
  challengeId: string,
  payload: Omit<ForumMessage, "id" | "timestamp" | "challengeId">
): ForumMessage {
  if (typeof window === "undefined" || !challengeId) {
    throw new Error("Local storage is only available in browser context");
  }

  const existing = getForumMessages(challengeId);
  const now = new Date().toISOString();
  const newMessage: ForumMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    challengeId,
    senderId: payload.senderId,
    senderName: payload.senderName || "Participant",
    senderRole: payload.senderRole,
    organizationId: payload.organizationId || null,
    organizationName: payload.organizationName || null,
    organizationType: payload.organizationType || null,
    message: payload.message.trim(),
    timestamp: now,
  };

  const updatedMessages = [...existing, newMessage];
  const conversation: ForumConversation = {
    challengeId,
    messages: updatedMessages,
    updatedAt: now,
  };

  localStorage.setItem(getForumStorageKey(challengeId), JSON.stringify(conversation));
  return newMessage;
}

export function clearForumMessages(challengeId: string): void {
  if (typeof window === "undefined" || !challengeId) return;
  localStorage.removeItem(getForumStorageKey(challengeId));
}

/**
 * Default Forum Conversation Initialization:
 * Automatically seeds an initial professional collaboration conversation
 * between Citizen Submitter, University Engineering Team, and Industry Partner
 * when an authorized participant accesses the forum for the first time.
 * If messages already exist, returns existing conversation without re-seeding.
 */
export function initializeDefaultForumConversation(
  challengeId: string,
  options?: {
    citizenName?: string;
    universityName?: string;
    industryName?: string;
    problemTitle?: string;
    district?: string;
  }
): ForumMessage[] {
  if (typeof window === "undefined" || !challengeId) return [];

  // If conversation already exists, preserve it completely
  const existing = getForumMessages(challengeId);
  if (existing && existing.length > 0) {
    return existing;
  }

  const citizenName = options?.citizenName || "Citizen Submitter";
  const universityName = options?.universityName || "National Institute of Technology, Jamshedpur";
  const industryName = options?.industryName || "Tata Steel CSR / Engineering Partner";
  const problemTitle = options?.problemTitle || "this reported challenge";
  const districtSuffix = options?.district ? ` in ${options.district}` : "";

  const baseTime = Date.now() - 3600000 * 4; // 4 hours ago

  const initialMessages: ForumMessage[] = [
    {
      id: `msg-init-${challengeId}-1`,
      challengeId,
      senderId: "participant-citizen",
      senderName: citizenName,
      senderRole: "CITIZEN",
      organizationName: null,
      organizationType: null,
      message: `Thank you for taking up this problem. The issue regarding "${problemTitle}"${districtSuffix} becomes particularly difficult during peak usage periods. I can provide additional location details and field observations if required.`,
      timestamp: new Date(baseTime).toISOString(),
    },
    {
      id: `msg-init-${challengeId}-2`,
      challengeId,
      senderId: "participant-university",
      senderName: `Prof. Academic Lead`,
      senderRole: "UNIVERSITY",
      organizationName: universityName,
      organizationType: "Higher Education Institution",
      message: `Thank you for reporting the issue. Our multidisciplinary engineering team has reviewed the problem and is currently evaluating the possible intervention approach. We will coordinate with the relevant stakeholders before moving to field validation.`,
      timestamp: new Date(baseTime + 1800000).toISOString(), // +30 mins
    },
    {
      id: `msg-init-${challengeId}-3`,
      challengeId,
      senderId: "participant-industry",
      senderName: `Technical Solutions Lead`,
      senderRole: "INDUSTRY",
      organizationName: industryName,
      organizationType: "Industry / Ecosystem Partner",
      message: `We can support the team with technical inputs and field testing once the proposed approach is ready for validation.`,
      timestamp: new Date(baseTime + 3600000).toISOString(), // +60 mins
    },
    {
      id: `msg-init-${challengeId}-4`,
      challengeId,
      senderId: "participant-university",
      senderName: `Prof. Academic Lead`,
      senderRole: "UNIVERSITY",
      organizationName: universityName,
      organizationType: "Higher Education Institution",
      message: `That support would be useful. We will share the initial implementation requirements and proposed testing plan through the project workspace.`,
      timestamp: new Date(baseTime + 5400000).toISOString(), // +90 mins
    },
  ];

  const conversation: ForumConversation = {
    challengeId,
    messages: initialMessages,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getForumStorageKey(challengeId), JSON.stringify(conversation));
  return initialMessages;
}

/**
 * Backward compatibility alias for tests and existing callers.
 */
export function seedDemoForumMessages(
  challengeId: string,
  options?: {
    citizenName?: string;
    universityName?: string;
    industryName?: string;
    problemTitle?: string;
    district?: string;
  }
): ForumMessage[] {
  return initializeDefaultForumConversation(challengeId, options);
}
