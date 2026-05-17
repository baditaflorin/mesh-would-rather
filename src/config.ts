import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-would-rather",
  description: "Would-you-rather A/B vote with reveal phase.",
  accentHex: "#ffb14d",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
