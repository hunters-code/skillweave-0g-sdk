export type RegisterSkillInput = {
  name: string;
  version: string;
};

export async function registerSkill(input: RegisterSkillInput): Promise<RegisterSkillInput> {
  return input;
}
