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
  return `Failed to publish plugin "${slug}": ${detail}`;
}
export function formatClawhubDeleteFailedMessage(
  slug: string,
  detail: string
): string {
  return `Failed to delete plugin "${slug}": ${detail}`;
}
export function formatClawhubUndeleteFailedMessage(
  slug: string,
  detail: string
): string {
  return `Failed to undelete plugin "${slug}": ${detail}`;
}
export function formatClawhubGetPluginFailedMessage(
  slug: string,
  detail: string
): string {
  return `Failed to get plugin "${slug}": ${detail}`;
}
export function formatClawhubListPluginsFailedMessage(detail: string): string {
  return `Failed to list plugins: ${detail}`;
}
export function formatClawhubWhoamiFailedMessage(detail: string): string {
  return `Failed whoami: ${detail}`;
}
export function formatClawhubSearchPluginsFailedMessage(detail: string): string {
  return `Failed to search plugins: ${detail}`;
}

export const ERR_CLAWHUB_PUBLISH_NO_FILES = "publishPlugin requires at least one file";
export const ERR_CLAWHUB_PUBLISH_PLUGIN_MD_REQUIRED = "ClawHub requires PLUGIN.md or plugins.md in the uploaded files";
