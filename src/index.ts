import { Construct } from 'constructs';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import { aws_eks as eks } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

export interface EksClusterStackProps {
  appName: string;
}

export class EksCluster extends Construct {
  constructor(scope: Construct, id: string, props: EksClusterStackProps) {
    super(scope, id);

    const appName = props.appName;

    const vpcId = ssm.StringParameter.fromStringParameterAttributes(this, 'vpcid', {
      parameterName: `/network/vpc_id`
    }).stringValue;

    const az1 = ssm.StringParameter.fromStringParameterAttributes(this, 'az1', {
      parameterName: `/network/az1`
    }).stringValue;

    const az2 = ssm.StringParameter.fromStringParameterAttributes(this, 'az2', {
      parameterName: `/network/az2`
    }).stringValue;

    const pubsub1 = ssm.StringParameter.fromStringParameterAttributes(this, 'pubsub1', {
      parameterName: `/network/publicsubnets1`
    }).stringValue;

    const pubsub2 = ssm.StringParameter.fromStringParameterAttributes(this, 'pubsub2', {
      parameterName: `/network/publicsubnets2`
    }).stringValue;

    const prisub1 = ssm.StringParameter.fromStringParameterAttributes(this, 'prisub1', {
      parameterName: `/network/privatesubnets1`
    }).stringValue;

    const prisub2 = ssm.StringParameter.fromStringParameterAttributes(this, 'prisub2', {
      parameterName: `/network/privatesubnets2`
    }).stringValue;

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const vpc = ec2.Vpc.fromVpcAttributes(this, "VPC", {
      vpcId: vpcId,
      availabilityZones: [
        az1,
        az2
      ],
      publicSubnetIds: [
        pubsub1,
        pubsub2
      ],
      privateSubnetIds: [
        prisub1,
        prisub2
      ]
    });

    const cluster = new eks.FargateCluster(this, `${appName}-cluster`, {
      clusterName: `${appName}`,
      mastersRole: clusterAdmin,
      version: eks.KubernetesVersion.V1_21,
      vpc: vpc,
      albController: {
        version: eks.AlbControllerVersion.V2_4_1
      },
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.SCHEDULER
      ]
    });

    const kubectlRole = cluster.kubectlRole ? cluster.kubectlRole.roleArn : '';

    new ssm.StringParameter(this, 'PRIVATE_SUBNETS', {
      description: `EKS Cluster Kubectl ARN`,
      parameterName: `/eks/${appName}/KubectlRoleArn`,
      stringValue: kubectlRole
    });
  }
}