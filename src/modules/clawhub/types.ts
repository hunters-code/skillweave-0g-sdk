export type ClawhubSkillFile = {
  relPath: string;
  bytes: Uint8Array | Buffer;
  contentType?: string;
};

export type ClawhubForkOf = {
  slug: string;
  version?: string;
};

export type ClawhubPublishSkillInput = {
  slug: string;
  displayName: string;
  version: string;
  files: ClawhubSkillFile[];
  changelog?: string;
  tags?: string[];
  forkOf?: ClawhubForkOf;
};

export type ClawhubPublishSkillResponse = {
  ok: true;
  skillId: string;
  versionId: string;
};

export type ClawhubDeleteSkillResponse = {
  ok: true;
};
