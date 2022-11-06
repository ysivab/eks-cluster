import { Construct } from 'constructs';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import { aws_eks as eks } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

export interface EksClusterStackProps {
  appName: string;
  services: [any]
}

export class EksCluster extends Construct {
  constructor(scope: Construct, id: string, props: EksClusterStackProps) {
    super(scope, id);

    const appName = props.appName;
    const services = props.services;

    const vpcId = ssm.StringParameter.fromStringParameterAttributes(this, 'vpcid', {
      parameterName: `/network/${appName}/vpc_id`
    }).stringValue;

    const az1 = ssm.StringParameter.fromStringParameterAttributes(this, 'az1', {
      parameterName: `/network/${appName}/az1`
    }).stringValue;

    const az2 = ssm.StringParameter.fromStringParameterAttributes(this, 'az2', {
      parameterName: `/network/${appName}/az2`
    }).stringValue;

    const pubsub1 = ssm.StringParameter.fromStringParameterAttributes(this, 'pubsub1', {
      parameterName: `/network/${appName}/pubsub1`
    }).stringValue;

    const pubsub2 = ssm.StringParameter.fromStringParameterAttributes(this, 'pubsub2', {
      parameterName: `/network/${appName}/pubsub2`
    }).stringValue;

    const prisub1 = ssm.StringParameter.fromStringParameterAttributes(this, 'prisub1', {
      parameterName: `/network/${appName}/prisub1`
    }).stringValue;

    const prisub2 = ssm.StringParameter.fromStringParameterAttributes(this, 'prisub2', {
      parameterName: `/network/${appName}/prisub2`
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

    const cluster = new eks.FargateCluster(this, 'cluster1', {
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

    const manifests = [];

    const ingressRules = services.map(e => {
      return {
        host: e.hostName,
        http: {
          paths: [
            {
              path: "/",
              pathType: "Prefix",
              backend: {
                service: {
                  name: `svc-${e.serviceName}`,
                  port: {
                    number: 80
                  }
                }
              }
            }
          ]
        }
      }
    });

    manifests.push({
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name: `${appName}`,
        annotations: {
          "alb.ingress.kubernetes.io/scheme": "internet-facing",
          "alb.ingress.kubernetes.io/target-type": "ip"
        }
      },
      spec: {
        ingressClassName: "alb",
        rules: ingressRules
      }
    });


    // deployment
    services.map(e => {
      manifests.push({
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: { name: e.serviceName },
        spec: {
          replicas: e.desiredCount,
          selector: { matchLabels: { app: e.serviceName } },
          template: {
            metadata: { labels: { app: e.serviceName } },
            spec: {
              containers: [
                {
                  name: e.containerName,
                  image: e.imageUri,
                  ports: [{ containerPort: e.containerPort }]
                }
              ]
            }
          }
        }
      })
    });


    // services
    services.map(e => {
      manifests.push({
        apiVersion: "v1",
        kind: "Service",
        metadata: { name: `${e.serviceName}` },
        spec: {
          type: "NodePort",
          ports: [{ port: 80, targetPort: `${e.containerPort}`, protocol: "TCP" }],
          selector: { app: e.serviceName }
        }
      })
    })

    // apply manifest to k8s
    new eks.KubernetesManifest(this, 'hello-world-svc', {
      cluster,
      manifest: manifests
    });
  }
}