export type ClawhubPluginFile = {
  relPath: string;
  bytes: Uint8Array | Buffer;
  contentType?: string;
};

export type ClawhubForkOf = {
  slug: string;
  version?: string;
};

export type ClawhubPublishPluginInput = {
  slug: string;
  displayName: string;
  version: string;
  files: ClawhubPluginFile[];
  changelog?: string;
  tags?: string[];
  forkOf?: ClawhubForkOf;
};

export type ClawhubPublishPluginResponse = {
  ok: true;
  pluginId: string;
  versionId: string;
};

export type ClawhubDeletePluginResponse = {
  ok: true;
};
