export class SkillweaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillweaveError";
  }
}
