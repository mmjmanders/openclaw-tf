import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

const region = $app.stage === "dev" ? "eu-central-1" : "eu-central-1";
const bundleId = $app.stage === "dev" ? "small_3_0" : "small_3_0";

const publicKey = new sst.Secret("LightsailPublicKey", "public-key");
const allowedCidrs = new sst.Secret("LightsailAllowedCidrs", "allowed-cidrs");
const allowedPorts = new sst.Secret("LightsailAllowedPorts", "allowed-ports");

const name = `lightsail-${$app.stage}`;
const accountId = aws.getCallerIdentityOutput().accountId;

const lightsailKeyPair = new aws.lightsail.KeyPair("KeyPair", {
  name: `${name}-keypair`,
  publicKey: publicKey.value,
});

const instanceRole = new aws.iam.Role("LightsailInstanceRole", {
  name: `${name}-instance-ssm-role`,
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "lightsail.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  }),
});

const rolePolicy = new aws.iam.RolePolicy("LightsailSSMReadPolicy", {
  role: instanceRole.name,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["ssm:GetParameter"],
        Resource: `arn:aws:ssm:${region}:*:parameter/${name}/*`,
      },
    ],
  }),
});

export const lightsailInstance = new aws.lightsail.Instance(
  "LightsailInstance",
  {
    name: `${name}-instance`,
    blueprintId: "openclaw_ls_1_0",
    bundleId,
    availabilityZone: `${region}a`,
    keyPairName: lightsailKeyPair.name,
    userData: `
until aws ssm get-parameter --region ${region} --name /${name}/access-key-id > /dev/null 2>&1; do
  echo "Waiting for credentials in SSM..."
  sleep 10
done

export AWS_ACCESS_KEY_ID=$(aws ssm get-parameter \\
  --region ${region} \\
  --name /${name}/access-key-id \\
  --query Parameter.Value --output text)

export AWS_SECRET_ACCESS_KEY=$(aws ssm get-parameter \\
  --region ${region} \\
  --name /${name}/secret-access-key \\
  --with-decryption \\
  --query Parameter.Value --output text)

export AWS_DEFAULT_REGION=${region}

curl -s https://d25b4yjpexuuj4.cloudfront.net/scripts/lightsail/setup-lightsail-openclaw-bedrock-role.sh | bash -s -- ${name}-instance ${region}
  `,
  },
  { dependsOn: [instanceRole, rolePolicy] },
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

const instanceId = new command.local.Command(
  "GetInstance",
  {
    create: `aws lightsail get-instance --instance-name ${name}-instance --region ${region} --query 'instance.supportCode' --output text`,
    logging: command.local.Logging.None,
  },
  {
    dependsOn: [lightsailInstance],
  },
).stdout.apply((stdout) => stdout.trim().split("/")[1]);

const policy = new aws.iam.Policy("LightsailPolicy", {
  name: `${name}-policy`,
  policy: pulumi.all([accountId, instanceId]).apply(([acct, iid]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "STSCallerIdentity",
          Effect: "Allow",
          Action: ["sts:GetCallerIdentity"],
          Resource: "*",
        },
        {
          Sid: "LightsailGetInstance",
          Effect: "Allow",
          Action: ["lightsail:GetInstance"],
          Resource: `arn:aws:lightsail:${region}:${acct}:Instance/${name}`,
        },
        {
          Sid: "IAMRoleManagement",
          Effect: "Allow",
          Action: [
            "iam:GetRole",
            "iam:CreateRole",
            "iam:UpdateAssumeRolePolicy",
            "iam:PutRolePolicy",
          ],
          Resource: `arn:aws:iam::${acct}:role/LightsailRoleFor-${iid}`,
        },
      ],
    }),
  ),
});

const user = new aws.iam.User("LightsailSetupUser", {
  name: `${name}-setup-user`,
});

new aws.iam.UserPolicyAttachment("LightsailSetupUserPolicyAttachment", {
  user: user.name,
  policyArn: policy.arn,
});

const accessKey = new aws.iam.AccessKey("LightsailSetupAccessKey", {
  user: user.name,
});

new aws.ssm.Parameter("LightsailAccessKeyId", {
  name: `/${name}/access-key-id`,
  type: "String",
  value: accessKey.id,
});

new aws.ssm.Parameter("LightsailSecretAccessKey", {
  name: `/${name}/secret-access-key`,
  type: "SecureString",
  value: accessKey.secret,
});
