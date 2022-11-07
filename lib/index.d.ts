import { Construct } from 'constructs';
export interface EksClusterStackProps {
    appName: string;
}
export declare class EksCluster extends Construct {
    constructor(scope: Construct, id: string, props: EksClusterStackProps);
}
