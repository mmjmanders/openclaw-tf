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
                    region: 'eu-central-1'
                }
            }
        };
    },
    async run() {
        await import('./infra/lightsail');
    },
});
