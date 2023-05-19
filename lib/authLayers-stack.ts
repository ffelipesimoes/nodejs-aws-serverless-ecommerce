import * as cdk from "aws-cdk-lib"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as ssm from "aws-cdk-lib/aws-ssm"
import { Construct } from 'constructs'

export class AuthLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create the lambda layer
    const authUserInfoLayer = new lambda.LayerVersion(this, "AuthUserInfoLayer", {
      code: lambda.Code.fromAsset('lambda/auth/layers/authUserInfo'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      layerVersionName: "AuthUserInfo",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Export the layer ARN
    new ssm.StringParameter(this, "AuthUserInfoLayerVersionArn", {
      parameterName: "AuthUserInfoLayerVersionArn",
      stringValue: authUserInfoLayer.layerVersionArn,
    })
  }

}