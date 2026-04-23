import fs from "node:fs";
import path from "node:path";
import { SkillweaveClient } from "../src";

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const pluginMd = `---
name: Skillweave SDK publish smoke test
description: Verifies ClawHub publish flows from the TypeScript client with a non-trivial PLUGIN.md body.
---

## Purpose

Use this plugin when you need a **concrete, repeatable checklist** for validating that a Skillweave or ClawHub client can upload a plugin bundle, that the server accepts the payload, and that the published artifact contains expected files.

## When to apply

- After changing publish request serialization, compression, or multipart boundaries in the SDK.
- When debugging HTTP 4xx responses from the plugins API (thin content, missing PLUGIN.md, invalid semver).
- Before tagging a release that touches \`publishPlugin\` or ClawHub integration tests.

## Preconditions

- Environment variable \`CLAWHUB_TOKEN\` is set to a token with publish permission for the target namespace or slug.
- The slug you pass to \`publishPlugin\` is available or you intend to publish a new semver for an existing slug.
- \`files\` includes \`PLUGIN.md\` (or \`plugins.md\`) with non-trivial documentation, not a one-line placeholder.

## Workflow

1. Load secrets from \`.env\` without committing tokens to version control.
2. Build a UTF-8 buffer for \`PLUGIN.md\` that includes this frontmatter block and several sections (purpose, workflow, constraints).
3. Call \`SkillweaveClient.publishPlugin\` with \`slug\`, \`displayName\`, \`version\`, and the file list.
4. On success, log the returned identifiers and confirm the plugin appears in the registry UI or list API.
5. On HTTP 400 with a message about thin or templated content, expand PLUGIN.md with domain-specific steps, examples, and edge cases until the validator accepts the bundle.

## Constraints and edge cases

- **Version format:** Use semantic versioning strings the API accepts (for example \`1.0.0\`, not bare \`1\`).
- **Content quality:** Automated checks reject boilerplate-only bodies. Prefer real procedures tied to your repository or team.
- **File paths:** Use forward slashes in \`relPath\` entries; avoid absolute paths on the client machine leaking into the archive structure.

## Example invocation shape (TypeScript)

\`\`\`typescript
const client = new SkillweaveClient({
  clawhub: { apiKey: process.env.CLAWHUB_TOKEN! },
});
await client.publishPlugin({
  slug: "my-plugin-1",
  displayName: "Skillweave SDK publish smoke test",
  version: "1.0.0",
  files: [{ relPath: "PLUGIN.md", bytes: new TextEncoder().encode(pluginMd) }],
});
\`\`\`

## Verification

After publish, fetch the plugin by slug or open the ClawHub listing and confirm the version, display name, and that PLUGIN.md renders with headings intact. If integration tests delete plugins, run undelete or republish only after confirming slug policy for your account.
`;

const client = new SkillweaveClient({
  clawhub: {
    apiKey: process.env.CLAWHUB_TOKEN!,
  },
});

async function main() {
  const pluginBody = new TextEncoder().encode(pluginMd);
  const publish = await client.publishPlugin({
    slug: "skillweave-sdk-publish-smoke-test",
    displayName: "Skillweave SDK publish smoke test",
    version: "1.0.0",
    files: [
      {
        relPath: "PLUGIN.md",
        bytes: pluginBody,
      },
    ],
  });

  console.log("Published:", publish);
}

main();
