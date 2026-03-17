/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "openclaw-aws",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: process.env.AWS_DEFAULT_REGION || "eu-central-1",
          version: "7.22.0",
        },
        command: "1.2.1",
      },
    };
  },
  async run() {
    await import("./infra/lightsail");
  },
});
