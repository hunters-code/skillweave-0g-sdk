import { SkillweaveClient } from "../src";

const client = new SkillweaveClient({
  rpcUrl: "http://localhost:8545"
});

console.log(client.getConfig());
