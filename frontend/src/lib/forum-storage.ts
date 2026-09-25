/**
 * SamadhanSetu - Private Problem Communication Forum
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
 * Demo Seed Mechanism:
 * Seeds realistic multi-stakeholder dialogue for demonstration purposes.
 * Clearly marked as demonstration discussion.
 */
export function seedDemoForumMessages(
  challengeId: string,
  options?: {
    citizenName?: string;
    universityName?: string;
    industryName?: string;
    problemTitle?: string;
  }
): ForumMessage[] {
  if (typeof window === "undefined" || !challengeId) return [];

  const citizenName = options?.citizenName || "Citizen Submitter";
  const universityName = options?.universityName || "National Institute of Technology, Jamshedpur";
  const industryName = options?.industryName || "Tata Steel CSR / Engineering Partner";
  const problemTitle = options?.problemTitle || "this civic challenge";

  const baseTime = Date.now() - 3600000 * 3; // 3 hours ago

  const demoMessages: ForumMessage[] = [
    {
      id: `demo-${challengeId}-1`,
      challengeId,
      senderId: "demo-citizen",
      senderName: citizenName,
      senderRole: "CITIZEN",
      organizationName: null,
      organizationType: null,
      message: `Could you please share the expected timeline and approach for addressing ${problemTitle}? Our local community is eager to know how the solution will be tested.`,
      timestamp: new Date(baseTime).toISOString(),
    },
    {
      id: `demo-${challengeId}-2`,
      challengeId,
      senderId: "demo-university",
      senderName: `Prof. Academic Lead`,
      senderRole: "UNIVERSITY",
      organizationName: universityName,
      organizationType: "Higher Education Institution",
      message: `Greetings! Our multidisciplinary student and faculty team has completed the preliminary engineering analysis. We are currently finalizing the prototype requirements and test specifications before initiating field validation.`,
      timestamp: new Date(baseTime + 1800000).toISOString(), // +30 mins
    },
    {
      id: `demo-${challengeId}-3`,
      challengeId,
      senderId: "demo-industry",
      senderName: `R&D Lead`,
      senderRole: "INDUSTRY",
      organizationName: industryName,
      organizationType: "Industry / Innovation Partner",
      message: `Our technical team has reviewed the solution architecture. We have approved collaboration support to provide hardware components, technical mentoring, and pilot deployment testing in your district.`,
      timestamp: new Date(baseTime + 3600000).toISOString(), // +60 mins
    },
    {
      id: `demo-${challengeId}-4`,
      challengeId,
      senderId: "demo-citizen",
      senderName: citizenName,
      senderRole: "CITIZEN",
      organizationName: null,
      organizationType: null,
      message: `Thank you very much! Please keep me updated when field visits and pilot trials begin. We are happy to coordinate local access.`,
      timestamp: new Date(baseTime + 5400000).toISOString(), // +90 mins
    },
  ];

  const conversation: ForumConversation = {
    challengeId,
    messages: demoMessages,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getForumStorageKey(challengeId), JSON.stringify(conversation));
  return demoMessages;
}
