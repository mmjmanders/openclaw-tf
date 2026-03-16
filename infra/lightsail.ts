import { local } from "@pulumi/command";

const region = $app.stage === "dev" ? "eu-central-1" : "eu-central-1";
const bundleId = $app.stage === "dev" ? "small_3_0" : "small_3_0";

const publicKey = new sst.Secret("LightsailPublicKey", "public-key");
const allowedCidrs = new sst.Secret("LightsailAllowedCidrs", "allowed-cidrs");
const allowedPorts = new sst.Secret("LightsailAllowedPorts", "allowed-ports");

const name = `lightsail-${$app.stage}`;

const lightsailKeyPair = new aws.lightsail.KeyPair("KeyPair", {
  name: `${name}-keypair`,
  publicKey: publicKey.value,
});

export const lightsailInstance = new aws.lightsail.Instance(
  "LightsailInstance",
  {
    name: `${name}-instance`,
    blueprintId: "openclaw_ls_1_0",
    bundleId,
    availabilityZone: `${region}a`,
    keyPairName: lightsailKeyPair.name,
  },
);

new aws.lightsail.InstancePublicPorts("PublicPorts", {
  instanceName: lightsailInstance.name,
  portInfos: allowedPorts.value.apply((value) =>
    value
      .split(/,\s*/)
      .map(Number)
      .map(
        (port) =>
          ({
            fromPort: port,
            toPort: port,
            protocol: "tcp",
            cidrs: allowedCidrs.value.apply((t) => t.split(/,\s*/)),
            ...(port === 22 ? { cidrListAliases: ["lightsail-connect"] } : {}),
          }) as aws.types.input.lightsail.InstancePublicPortsPortInfo,
      ),
  ),
});

const instanceId = new local.Command("GetLightsailInstanceId", {
  logging: local.Logging.None,
  create: `aws lightsail get-instance --instance-name ${name}-instance --region ${region} --query 'instance.supportCode' --output text`,
}).stdout;

new local.Command(
  "EnableBedrockOnLightsailInstance",
  {
    logging: local.Logging.None,
    create: `curl -s https://d25b4yjpexuuj4.cloudfront.net/scripts/lightsail/setup-lightsail-openclaw-bedrock-role.sh | bash -s -- ${name}-instance ${region}`,
    delete: instanceId.apply(
      (iid) => `aws iam delete-role --role-name LightsailRoleFor-${iid}`,
    ),
  },
  { dependsOn: [lightsailInstance] },
);
