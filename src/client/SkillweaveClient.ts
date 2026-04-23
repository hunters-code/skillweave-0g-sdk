import { ERR_CLAWHUB_CLIENT_NOT_INITIALIZED } from "../constants/client-errors";
import {
  ClawhubClient,
  ClawhubClientConfig,
  type ClawhubPublishPluginInput,
  type ClawhubPublishPluginResponse,
} from "../modules/clawhub";

export type SkillweaveClientConfig = {
  clawhub?: ClawhubClientConfig;
};

export class SkillweaveClient {
  private _clawhub: ClawhubClient | null = null;

  constructor(private readonly config: SkillweaveClientConfig) {
    if (config.clawhub) {
      this._clawhub = new ClawhubClient(config.clawhub);
    }
  }

  getConfig(): SkillweaveClientConfig {
    return this.config;
  }

  get clawhub(): ClawhubClient {
    if (!this._clawhub) {
      throw new Error(ERR_CLAWHUB_CLIENT_NOT_INITIALIZED);
    }
    return this._clawhub;
  }

  async publishPlugin(
    input: ClawhubPublishPluginInput
  ): Promise<ClawhubPublishPluginResponse> {
    if (!this._clawhub) {
      throw new Error(ERR_CLAWHUB_CLIENT_NOT_INITIALIZED);
    }
    return this._clawhub.publishPlugin(input);
  }
}
