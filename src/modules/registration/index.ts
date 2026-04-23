export type RegisterPluginInput = {
  name: string;
  version: string;
};

export async function registerPlugin(input: RegisterPluginInput): Promise<RegisterPluginInput> {
  return input;
}
