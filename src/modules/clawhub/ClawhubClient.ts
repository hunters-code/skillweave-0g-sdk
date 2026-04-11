import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import {
  CLAWHUB_AUTH_BEARER_PREFIX,
  CLAWHUB_DEFAULT_REGISTRY_BASE_URL,
  CLAWHUB_DEFAULT_TIMEOUT_MS,
  CLAWHUB_FORM_FIELD_FILES,
  CLAWHUB_FORM_FIELD_PAYLOAD,
  CLAWHUB_PATH_SEARCH,
  CLAWHUB_PATH_SKILLS,
  CLAWHUB_PATH_WHOAMI,
  CLAWHUB_PUBLISH_ACCEPT_LICENSE_TERMS,
  CLAWHUB_PUBLISH_PAYLOAD_KEY_ACCEPT_LICENSE,
  CLAWHUB_PUBLISH_PAYLOAD_KEY_CHANGELOG,
  CLAWHUB_PUBLISH_PAYLOAD_KEY_DISPLAY_NAME,
  CLAWHUB_PUBLISH_PAYLOAD_KEY_FORK_OF,
  CLAWHUB_PUBLISH_PAYLOAD_KEY_SLUG,
  CLAWHUB_PUBLISH_PAYLOAD_KEY_TAGS,
  CLAWHUB_PUBLISH_PAYLOAD_KEY_VERSION,
  CLAWHUB_QUERY_CURSOR,
  CLAWHUB_QUERY_LIMIT,
  CLAWHUB_QUERY_SEARCH_Q,
  CLAWHUB_QUERY_SORT,
  CLAWHUB_TAG_LATEST,
  CLAWHUB_SKILL_DOC_ALT,
  CLAWHUB_SKILL_DOC_PRIMARY,
  HTTP_HEADER_AUTHORIZATION,
  MIME_APPLICATION_JSON,
  MIME_TEXT_PLAIN,
  clawhubPathSkill,
  clawhubPathSkillUndelete,
} from "../../constants/clawhub-http";
import {
  ERR_CLAWHUB_PUBLISH_NO_FILES,
  ERR_CLAWHUB_PUBLISH_SKILL_MD_REQUIRED,
  formatClawhubDeleteFailedMessage,
  formatClawhubGetSkillFailedMessage,
  formatClawhubListSkillsFailedMessage,
  formatClawhubPublishFailedMessage,
  formatClawhubSearchFailedMessage,
  formatClawhubUndeleteFailedMessage,
  formatClawhubWhoamiFailedMessage,
  serializeClawhubHttpErrorDetail,
} from "../../constants/clawhub-errors";
import { SkillweaveError } from "../../errors";
import {
  ClawhubDeleteSkillResponse,
  ClawhubPublishSkillInput,
  ClawhubPublishSkillResponse,
} from "./types";

export type ClawhubClientConfig = {
  baseUrl?: string;
  apiKey: string;
  timeoutMs?: number;
};

function hasSkillMarkdown(files: ClawhubPublishSkillInput["files"]): boolean {
  return files.some((f) => {
    const lower = f.relPath.toLowerCase();
    return (
      lower === CLAWHUB_SKILL_DOC_PRIMARY.toLowerCase() ||
      lower === CLAWHUB_SKILL_DOC_ALT.toLowerCase()
    );
  });
}

export class ClawhubClient {
  private readonly http: AxiosInstance;

  constructor(private readonly config: ClawhubClientConfig) {
    const baseURL = config.baseUrl ?? CLAWHUB_DEFAULT_REGISTRY_BASE_URL;
    this.http = axios.create({
      baseURL,
      timeout: config.timeoutMs ?? CLAWHUB_DEFAULT_TIMEOUT_MS,
      headers: {
        [HTTP_HEADER_AUTHORIZATION]:
          CLAWHUB_AUTH_BEARER_PREFIX + config.apiKey,
      },
    });
  }

  async whoami(): Promise<unknown> {
    try {
      const { data } = await this.http.get<unknown>(CLAWHUB_PATH_WHOAMI);
      return data;
    } catch (err) {
      throw new SkillweaveError(
        formatClawhubWhoamiFailedMessage(serializeClawhubHttpErrorDetail(err))
      );
    }
  }

  async publishSkill(
    input: ClawhubPublishSkillInput
  ): Promise<ClawhubPublishSkillResponse> {
    if (input.files.length === 0) {
      throw new SkillweaveError(ERR_CLAWHUB_PUBLISH_NO_FILES);
    }
    if (!hasSkillMarkdown(input.files)) {
      throw new SkillweaveError(ERR_CLAWHUB_PUBLISH_SKILL_MD_REQUIRED);
    }
    const tags = input.tags?.length ? input.tags : ["latest"];
    const payload: Record<string, unknown> = {
      [CLAWHUB_PUBLISH_PAYLOAD_KEY_SLUG]: input.slug,
      [CLAWHUB_PUBLISH_PAYLOAD_KEY_DISPLAY_NAME]: input.displayName,
      [CLAWHUB_PUBLISH_PAYLOAD_KEY_VERSION]: input.version,
      [CLAWHUB_PUBLISH_PAYLOAD_KEY_CHANGELOG]: input.changelog ?? "",
      [CLAWHUB_PUBLISH_PAYLOAD_KEY_ACCEPT_LICENSE]:
        CLAWHUB_PUBLISH_ACCEPT_LICENSE_TERMS,
      [CLAWHUB_PUBLISH_PAYLOAD_KEY_TAGS]: tags,
    };
    if (input.forkOf) {
      payload[CLAWHUB_PUBLISH_PAYLOAD_KEY_FORK_OF] = input.forkOf;
    }
    const form = new FormData();
    form.append(CLAWHUB_FORM_FIELD_PAYLOAD, JSON.stringify(payload), {
      contentType: `${MIME_APPLICATION_JSON}; charset=utf-8`,
    });
    for (const file of input.files) {
      const buf = Buffer.isBuffer(file.bytes)
        ? file.bytes
        : Buffer.from(file.bytes);
      form.append(CLAWHUB_FORM_FIELD_FILES, buf, {
        filename: file.relPath,
        contentType: file.contentType ?? MIME_TEXT_PLAIN,
      });
    }
    try {
      const { data } = await this.http.post<ClawhubPublishSkillResponse>(
        CLAWHUB_PATH_SKILLS,
        form,
        { headers: form.getHeaders(), maxBodyLength: Infinity }
      );
      return data;
    } catch (err) {
      throw new SkillweaveError(
        formatClawhubPublishFailedMessage(
          input.slug,
          serializeClawhubHttpErrorDetail(err)
        )
      );
    }
  }

  async getSkill(slug: string): Promise<unknown> {
    try {
      const { data } = await this.http.get<unknown>(clawhubPathSkill(slug));
      return data;
    } catch (err) {
      throw new SkillweaveError(
        formatClawhubGetSkillFailedMessage(
          slug,
          serializeClawhubHttpErrorDetail(err)
        )
      );
    }
  }

  async listSkills(params?: {
    limit?: number;
    sort?: string;
    cursor?: string;
  }): Promise<unknown> {
    try {
      const { data } = await this.http.get<unknown>(CLAWHUB_PATH_SKILLS, {
        params: {
          [CLAWHUB_QUERY_LIMIT]: params?.limit,
          [CLAWHUB_QUERY_SORT]: params?.sort,
          [CLAWHUB_QUERY_CURSOR]: params?.cursor,
        },
      });
      return data;
    } catch (err) {
      throw new SkillweaveError(
        formatClawhubListSkillsFailedMessage(serializeClawhubHttpErrorDetail(err))
      );
    }
  }

  async searchSkills(query: string): Promise<unknown> {
    try {
      const { data } = await this.http.get<unknown>(CLAWHUB_PATH_SEARCH, {
        params: { [CLAWHUB_QUERY_SEARCH_Q]: query },
      });
      return data;
    } catch (err) {
      throw new SkillweaveError(
        formatClawhubSearchFailedMessage(serializeClawhubHttpErrorDetail(err))
      );
    }
  }

  async deleteSkill(slug: string): Promise<ClawhubDeleteSkillResponse> {
    try {
      const { data } = await this.http.delete<ClawhubDeleteSkillResponse>(
        clawhubPathSkill(slug)
      );
      return data;
    } catch (err) {
      throw new SkillweaveError(
        formatClawhubDeleteFailedMessage(
          slug,
          serializeClawhubHttpErrorDetail(err)
        )
      );
    }
  }

  async undeleteSkill(slug: string): Promise<ClawhubDeleteSkillResponse> {
    try {
      const { data } = await this.http.post<ClawhubDeleteSkillResponse>(
        clawhubPathSkillUndelete(slug)
      );
      return data;
    } catch (err) {
      throw new SkillweaveError(
        formatClawhubUndeleteFailedMessage(
          slug,
          serializeClawhubHttpErrorDetail(err)
        )
      );
    }
  }
}
