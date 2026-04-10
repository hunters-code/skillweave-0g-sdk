export type AccessCheckInput = {
  skillId: string;
  account: string;
};

export async function checkAccess(input: AccessCheckInput): Promise<boolean> {
  return Boolean(input.skillId && input.account);
}
