export type AccessCheckInput = {
  pluginId: string;
  account: string;
};

export async function checkAccess(input: AccessCheckInput): Promise<boolean> {
  return Boolean(input.pluginId && input.account);
}
