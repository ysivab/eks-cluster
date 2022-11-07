"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EksCluster = void 0;
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const aws_cdk_lib_3 = require("aws-cdk-lib");
const aws_cdk_lib_4 = require("aws-cdk-lib");
class EksCluster extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const appName = props.appName;
        const vpcId = aws_cdk_lib_2.aws_ssm.StringParameter.fromStringParameterAttributes(this, 'vpcid', {
            parameterName: `/network/${appName}/vpc_id`
        }).stringValue;
        const az1 = aws_cdk_lib_2.aws_ssm.StringParameter.fromStringParameterAttributes(this, 'az1', {
            parameterName: `/network/${appName}/az1`
        }).stringValue;
        const az2 = aws_cdk_lib_2.aws_ssm.StringParameter.fromStringParameterAttributes(this, 'az2', {
            parameterName: `/network/${appName}/az2`
        }).stringValue;
        const pubsub1 = aws_cdk_lib_2.aws_ssm.StringParameter.fromStringParameterAttributes(this, 'pubsub1', {
            parameterName: `/network/${appName}/pubsub1`
        }).stringValue;
        const pubsub2 = aws_cdk_lib_2.aws_ssm.StringParameter.fromStringParameterAttributes(this, 'pubsub2', {
            parameterName: `/network/${appName}/pubsub2`
        }).stringValue;
        const prisub1 = aws_cdk_lib_2.aws_ssm.StringParameter.fromStringParameterAttributes(this, 'prisub1', {
            parameterName: `/network/${appName}/prisub1`
        }).stringValue;
        const prisub2 = aws_cdk_lib_2.aws_ssm.StringParameter.fromStringParameterAttributes(this, 'prisub2', {
            parameterName: `/network/${appName}/prisub2`
        }).stringValue;
        const clusterAdmin = new aws_cdk_lib_1.aws_iam.Role(this, 'AdminRole', {
            assumedBy: new aws_cdk_lib_1.aws_iam.AccountRootPrincipal()
        });
        const vpc = aws_cdk_lib_4.aws_ec2.Vpc.fromVpcAttributes(this, "VPC", {
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
        const cluster = new aws_cdk_lib_3.aws_eks.FargateCluster(this, `${appName}-cluster`, {
            clusterName: `${appName}`,
            mastersRole: clusterAdmin,
            version: aws_cdk_lib_3.aws_eks.KubernetesVersion.V1_21,
            vpc: vpc,
            albController: {
                version: aws_cdk_lib_3.aws_eks.AlbControllerVersion.V2_4_1
            },
            clusterLogging: [
                aws_cdk_lib_3.aws_eks.ClusterLoggingTypes.API,
                aws_cdk_lib_3.aws_eks.ClusterLoggingTypes.AUTHENTICATOR,
                aws_cdk_lib_3.aws_eks.ClusterLoggingTypes.SCHEDULER
            ]
        });
        const kubectlRole = cluster.kubectlRole ? cluster.kubectlRole.roleArn : '';
        new aws_cdk_lib_2.aws_ssm.StringParameter(this, 'PRIVATE_SUBNETS', {
            description: `EKS Cluster Kubectl ARN`,
            parameterName: `/eks/${appName}/KubectlRoleArn`,
            stringValue: kubectlRole
        });
    }
}
exports.EksCluster = EksCluster;
