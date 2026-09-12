import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUserRole(role?: string, t?: (key: string, fallback?: string) => string): string {
  if (!role) return t ? t("roles.CITIZEN", "Citizen") : "Citizen";
  switch (role) {
    case "CITIZEN":
      return t ? t("roles.CITIZEN", "Citizen") : "Citizen";
    case "UNIVERSITY_ADMIN":
      return t ? t("roles.UNIVERSITY_ADMIN", "University Administrator") : "University Administrator";
    case "FACULTY":
      return t ? t("roles.FACULTY", "Faculty Member") : "Faculty Member";
    case "STUDENT":
      return t ? t("roles.STUDENT", "Student Researcher") : "Student Researcher";
    case "INDUSTRY_ADMIN":
      return t ? t("roles.INDUSTRY_ADMIN", "Industry / Startup Administrator") : "Industry / Startup Administrator";
    case "INDUSTRY_MEMBER":
      return t ? t("roles.INDUSTRY_MEMBER", "Industry Member") : "Industry Member";
    case "GOVERNMENT_ADMIN":
      return t ? t("roles.GOVERNMENT_ADMIN", "Government Administrator") : "Government Administrator";
    case "GOVERNMENT_OFFICER":
      return t ? t("roles.GOVERNMENT_OFFICER", "Government Review Officer") : "Government Review Officer";
    case "PLATFORM_ADMIN":
      return t ? t("roles.PLATFORM_ADMIN", "Platform Administrator") : "Platform Administrator";
    case "INDUSTRY":
      return t ? t("roles.INDUSTRY", "Industry Partner") : "Industry Partner";
    case "GOVERNMENT":
      return t ? t("roles.GOVERNMENT", "Government Official") : "Government Official";
    default:
      return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatOrganizationType(type?: string | null, t?: (key: string, fallback?: string) => string): string {
  if (!type || typeof type !== "string" || !type.trim()) {
    return t ? t("org_types.ORGANIZATION", "Organization") : "Organization";
  }
  const clean = type.trim().toUpperCase();
  switch (clean) {
    case "INSTITUTION":
    case "ACADEMIC":
      return t ? t("org_types.INSTITUTION", "University / Research Institution") : "University / Research Institution";
    case "INDUSTRY":
    case "ENTERPRISE":
      return t ? t("org_types.INDUSTRY", "Industry / Enterprise") : "Industry / Enterprise";
    case "MSME":
      return t ? t("org_types.MSME", "MSME Partner") : "MSME Partner";
    case "STARTUP":
      return t ? t("org_types.STARTUP", "Startup Innovation Partner") : "Startup Innovation Partner";
    case "GOVERNMENT":
    case "PUBLIC_SECTOR":
      return t ? t("org_types.GOVERNMENT", "Government Department") : "Government Department";
    case "NGO":
      return t ? t("org_types.NGO", "Non-Governmental Organization") : "Non-Governmental Organization";
    case "COMMUNITY_ORGANIZATION":
      return t ? t("org_types.COMMUNITY_ORGANIZATION", "Community Organization") : "Community Organization";
    case "RESEARCH_INSTITUTE":
      return t ? t("org_types.RESEARCH_INSTITUTE", "Research Institute") : "Research Institute";
    case "OTHER":
      return t ? t("org_types.OTHER", "Organization") : "Organization";
    default:
      return clean
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatGeographicReach(reach?: string | null, t?: (key: string, fallback?: string) => string): string {
  if (!reach || typeof reach !== "string" || !reach.trim()) {
    return t ? t("reach.DISTRICT", "District Reach") : "District Reach";
  }
  const clean = reach.trim().toUpperCase();
  switch (clean) {
    case "DISTRICT":
      return t ? t("reach.DISTRICT", "District Reach") : "District Reach";
    case "STATEWIDE":
      return t ? t("reach.STATEWIDE", "Statewide Reach") : "Statewide Reach";
    case "NATIONAL":
      return t ? t("reach.NATIONAL", "National Reach") : "National Reach";
    default:
      return `${clean.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} Reach`;
  }
}

export function formatVerificationStatus(status?: string | null, t?: (key: string, fallback?: string) => string): string {
  if (!status || typeof status !== "string" || !status.trim()) {
    return t ? t("status.UNVERIFIED", "Unverified") : "Unverified";
  }
  const clean = status.trim().toUpperCase();
  switch (clean) {
    case "VERIFIED":
      return t ? t("status.VERIFIED", "Verified Institution") : "Verified Institution";
    case "PENDING_VERIFICATION":
    case "PENDING":
      return t ? t("status.PENDING_VERIFICATION", "Pending Verification") : "Pending Verification";
    case "REJECTED":
      return t ? t("status.VERIFICATION_REJECTED", "Verification Rejected") : "Verification Rejected";
    case "UNVERIFIED":
    default:
      return t ? t("status.UNVERIFIED", "Unverified") : "Unverified";
  }
}

export function formatAvailabilityStatus(status?: string | null, t?: (key: string, fallback?: string) => string): string {
  if (!status || typeof status !== "string" || !status.trim()) {
    return t ? t("status.UNKNOWN", "Unknown") : "Unknown";
  }
  const clean = status.trim().toUpperCase();
  switch (clean) {
    case "FRESH":
      return t ? t("status.FRESH", "Fresh & Available") : "Fresh & Available";
    case "STALE":
      return t ? t("status.STALE", "Stale (Renewal Required)") : "Stale (Renewal Required)";
    case "UNKNOWN":
    default:
      return t ? t("status.AVAILABILITY_UNKNOWN", "Availability Not Confirmed") : "Availability Not Confirmed";
  }
}

export function formatEvidenceType(type?: string | null, t?: (key: string, fallback?: string) => string): string {
  if (!type || typeof type !== "string" || !type.trim()) {
    return t ? t("evidence.SUPPORTING_DOCUMENT", "Supporting Document") : "Supporting Document";
  }
  const clean = type.trim().toUpperCase();
  switch (clean) {
    case "ACCREDITATION":
      return t ? t("evidence.ACCREDITATION", "Official Accreditation") : "Official Accreditation";
    case "CERTIFICATION":
      return t ? t("evidence.CERTIFICATION", "Industry Certification") : "Industry Certification";
    case "PROJECT_REPORT":
      return t ? t("evidence.PROJECT_REPORT", "Project Report / Case Study") : "Project Report / Case Study";
    case "PATENT":
      return t ? t("evidence.PATENT", "Registered Patent / IP") : "Registered Patent / IP";
    case "FACILITY_TOUR":
      return t ? t("evidence.FACILITY_TOUR", "Facility / Lab Verification") : "Facility / Lab Verification";
    case "IMAGE":
      return t ? t("evidence.IMAGE", "Photo Evidence") : "Photo Evidence";
    case "OTHER":
      return t ? t("evidence.SUPPORTING_DOCUMENT", "Supporting Document") : "Supporting Document";
    default:
      return clean
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatDateSafe(
  dateVal?: string | number | Date | null,
  fallback = "Not specified"
): string {
  if (!dateVal) return fallback;
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return fallback;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}
