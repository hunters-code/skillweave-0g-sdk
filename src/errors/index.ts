import { ERROR_CLASS_SKILLWEAVE } from "../constants/error-meta";

export class SkillweaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = ERROR_CLASS_SKILLWEAVE;
  }
}
