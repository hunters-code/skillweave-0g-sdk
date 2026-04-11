import { isAxiosError } from "axios";

export function serializeClawhubHttpErrorDetail(err: unknown): string {
  if (!isAxiosError(err)) {
    return err instanceof Error ? err.message : String(err);
  }
  const chunks: string[] = [err.message];
  const status = err.response?.status;
  if (status != null) {
    chunks.push(`HTTP ${status}`);
  }
  const data = err.response?.data;
  if (data !== undefined && data !== null && data !== "") {
    const text =
      typeof data === "string"
        ? data
        : (() => {
            try {
              return JSON.stringify(data);
            } catch {
              return String(data);
            }
          })();
    chunks.push(text);
  }
  return chunks.join(" — ");
}

export function formatClawhubPublishFailedMessage(
  slug: string,
  detail: string
): string {
  return `Failed to publish skill "${slug}": ${detail}`;
}
export function formatClawhubDeleteFailedMessage(
  slug: string,
  detail: string
): string {
  return `Failed to delete skill "${slug}": ${detail}`;
}
export function formatClawhubUndeleteFailedMessage(
  slug: string,
  detail: string
): string {
  return `Failed to undelete skill "${slug}": ${detail}`;
}
export function formatClawhubGetSkillFailedMessage(
  slug: string,
  detail: string
): string {
  return `Failed to get skill "${slug}": ${detail}`;
}
export function formatClawhubListSkillsFailedMessage(detail: string): string {
  return `Failed to list skills: ${detail}`;
}
export function formatClawhubWhoamiFailedMessage(detail: string): string {
  return `Failed whoami: ${detail}`;
}
export function formatClawhubSearchFailedMessage(detail: string): string {
  return `Failed to search skills: ${detail}`;
}

export const ERR_CLAWHUB_PUBLISH_NO_FILES = "publishSkill requires at least one file";
export const ERR_CLAWHUB_PUBLISH_SKILL_MD_REQUIRED = "ClawHub requires SKILL.md or skills.md in the uploaded files";
