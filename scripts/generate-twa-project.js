/* ==============================================================
   generate-twa-project.js
   `bubblewrap init` is interactive-only (it prompts for every field,
   even when a twa-manifest.json already has them) — there's no flag
   to run it unattended, which a CI build needs. This calls the same
   underlying @bubblewrap/core pieces `init` uses internally
   (TwaManifest.fromFile + TwaGenerator.createTwaProject), skipping
   only the interactive prompts. It also writes manifest-checksum.txt
   the same way the CLI does, so the later `bubblewrap build` step
   sees a matching checksum and proceeds straight to compiling
   instead of trying to re-run project generation itself.
   ============================================================== */
const fs = require("fs");
const crypto = require("crypto");
const { TwaManifest, TwaGenerator, BufferedLog, ConsoleLog } = require("@bubblewrap/core");

(async () => {
  const manifestFile = "./twa-manifest.json";
  const twaManifest = await TwaManifest.fromFile(manifestFile);

  const twaGenerator = new TwaGenerator();
  const log = new BufferedLog(new ConsoleLog("generate-twa-project"));
  await twaGenerator.createTwaProject(".", twaManifest, log, () => {});
  log.flush();

  const manifestContents = fs.readFileSync(manifestFile);
  const checksum = crypto.createHash("sha1").update(manifestContents).digest("hex");
  fs.writeFileSync("./manifest-checksum.txt", checksum);

  console.log("TWA Android project generated.");
})().catch((err) => {
  console.error("Failed to generate TWA project:", err);
  process.exit(1);
});
