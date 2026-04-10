export type SkillweaveClientConfig = {
  rpcUrl: string;
  chainId?: number;
};

export class SkillweaveClient {
  constructor(private readonly config: SkillweaveClientConfig) {}

  getConfig(): SkillweaveClientConfig {
    return this.config;
  }
}
