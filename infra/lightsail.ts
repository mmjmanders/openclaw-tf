const {LIGHTSAIL_BUNDLE_ID: bundleId, AWS_DEFAULT_REGION: region} = process.env

const publicKey = new sst.Secret("LightsailPublicKey", "public-key")
const allowedCidrs = new sst.Secret("LightsailAllowedCidrs", "allowed-cidrs")

const lightsailKeyPar = new aws.lightsail.KeyPair("KeyPair", {
    name: `${$app.stage}-keypair`,
    publicKey: publicKey.value,
})

export const lightsailInstance = new aws.lightsail.Instance("Instance", {
    name: `${$app.stage}-lightsail-instance`,
    blueprintId: 'openclaw_ls_1_0',
    bundleId,
    availabilityZone: `${region}a`,
})

const lightsailPublicPorts = new aws.lightsail.InstancePublicPorts("PublicPorts", {
    instanceName: lightsailInstance.name,
    portInfos: [{
        fromPort: 22,
        toPort: 22,
        protocol: 'tcp',
        cidrs: allowedCidrs.value.apply(t => t.split(/,\s+/))
    }, {
        fromPort: 443,
        toPort: 443,
        protocol: 'tcp',
        cidrs: allowedCidrs.value.apply(t => t.split(/,\s+/))
    }]
})
