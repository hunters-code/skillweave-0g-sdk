import {
  HTTP_HEADER_CONTENT_TYPE,
  MIME_APPLICATION_JSON,
} from "./http-common";

export { HTTP_HEADER_CONTENT_TYPE, MIME_APPLICATION_JSON };

export const HTTP_HEADER_AUTHORIZATION = "Authorization";

export const CLAWHUB_AUTH_BEARER_PREFIX = "Bearer ";

export const CLAWHUB_DEFAULT_REGISTRY_BASE_URL = "https://clawhub.ai";

export const CLAWHUB_DEFAULT_TIMEOUT_MS = 30_000;

const SEGMENT_API = "api";

const SEGMENT_V1 = "v1";

const SEGMENT_SKILLS = "skills";

const SEGMENT_WHOAMI = "whoami";

const SEGMENT_UNDELETE = "undelete";

const ROOT = "";

export const CLAWHUB_PATH_API_V1 = `${ROOT}/${SEGMENT_API}/${SEGMENT_V1}`;

export const CLAWHUB_PATH_WHOAMI = `${CLAWHUB_PATH_API_V1}/${SEGMENT_WHOAMI}`;

export const CLAWHUB_PATH_SKILLS = `${CLAWHUB_PATH_API_V1}/${SEGMENT_SKILLS}`;

export function clawhubPathSkill(slug: string): string {
  return `${CLAWHUB_PATH_SKILLS}/${encodeURIComponent(slug)}`;
}

export function clawhubPathSkillUndelete(slug: string): string {
  return `${clawhubPathSkill(slug)}/${SEGMENT_UNDELETE}`;
}

export const CLAWHUB_FORM_FIELD_PAYLOAD = "payload";

export const CLAWHUB_FORM_FIELD_FILES = "files";

export const CLAWHUB_PUBLISH_PAYLOAD_KEY_SLUG = "slug";

export const CLAWHUB_PUBLISH_PAYLOAD_KEY_DISPLAY_NAME = "displayName";

export const CLAWHUB_PUBLISH_PAYLOAD_KEY_VERSION = "version";

export const CLAWHUB_PUBLISH_PAYLOAD_KEY_CHANGELOG = "changelog";

export const CLAWHUB_PUBLISH_PAYLOAD_KEY_ACCEPT_LICENSE = "acceptLicenseTerms";

export const CLAWHUB_PUBLISH_PAYLOAD_KEY_TAGS = "tags";

export const CLAWHUB_PUBLISH_PAYLOAD_KEY_FORK_OF = "forkOf";

export const CLAWHUB_PUBLISH_ACCEPT_LICENSE_TERMS = true;

export const CLAWHUB_QUERY_LIMIT = "limit";

export const CLAWHUB_QUERY_SORT = "sort";

export const CLAWHUB_QUERY_CURSOR = "cursor";

export const CLAWHUB_QUERY_SEARCH_Q = "q";

export const CLAWHUB_TAG_LATEST = "latest";

export const CLAWHUB_PATH_SEARCH = `${CLAWHUB_PATH_API_V1}/search`;

export const MIME_TEXT_PLAIN = "text/plain";

export const CLAWHUB_SKILL_DOC_PRIMARY = "SKILL.md";

export const CLAWHUB_SKILL_DOC_ALT = "skills.md";
