import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as neptune from "aws-cdk-lib/aws-neptune";
import type { Construct } from "constructs";

/**
 * Private Amazon Neptune graph database for attack-path relationships.
 * Synthesized for the hackathon; deployment requires backend connectivity and IAM configuration.
 */
export class GraphStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Neptune lives in isolated private subnets, not on the public internet.
    const vpc = new ec2.Vpc(this, "GraphVpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const graphSecurityGroup = new ec2.SecurityGroup(this, "GraphSecurityGroup", {
      vpc,
      description: "Controls private access to the AAPG Neptune graph.",
      allowAllOutbound: false,
    });

    const subnetGroup = new neptune.CfnDBSubnetGroup(this, "GraphSubnetGroup", {
      dbSubnetGroupDescription: "Private subnets for the AAPG Neptune graph.",
      subnetIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
    });

    const cluster = new neptune.CfnDBCluster(this, "AttackPathGraphCluster", {
      dbClusterIdentifier: "aapg-attack-path-graph",
      dbSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [graphSecurityGroup.securityGroupId],
      storageEncrypted: true,
      iamAuthEnabled: true,
      deletionProtection: true,
      backupRetentionPeriod: 7,
    });

    new neptune.CfnDBInstance(this, "AttackPathGraphInstance", {
      dbClusterIdentifier: cluster.ref,
      dbInstanceIdentifier: "aapg-attack-path-instance-1",
      dbInstanceClass: "db.t3.medium",
      autoMinorVersionUpgrade: true,
      publiclyAccessible: false,
    });

    new cdk.CfnOutput(this, "GraphEndpoint", {
      value: cluster.attrEndpoint,
      description: "Private Neptune endpoint for attack-path queries.",
    });

    new cdk.CfnOutput(this, "GraphSecurityGroupId", {
      value: graphSecurityGroup.securityGroupId,
      description: "Security group future graph-processing Lambdas can be allowed to use.",
    });
  }
}