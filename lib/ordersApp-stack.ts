import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as ssm from "aws-cdk-lib/aws-ssm"

import { Construct } from 'constructs'

interface OrdersAppStackProps extends cdk.StackProps {
  productsDdb: dynamodb.Table
}

export class OrdersAppStack extends cdk.Stack {

  readonly ordersHandler: lambdaNodeJS.NodejsFunction

  constructor(scope: Construct, id: string, props: OrdersAppStackProps){
    super(scope, id, props)

    //This creates a table on dynamodb
     const ordersDdb = new dynamodb.Table(this, "OrdersDdb", {
      tableName: "orders",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1
    })

    //Orders Layer
    const ordersLayerArn = ssm.StringParameter.valueForStringParameter(this, "ordersLayerVersionArn" )
    const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ordersLayerVersionArn", ordersLayerArn)

    //Orders API Layer
    const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(this, "ordersApiLayerVersionArn" )
    const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ordersApiLayerVersionArn", ordersApiLayerArn)

    //Products Layer
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn" )
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)

    // Creating a function on lambda
    this.ordersHandler = new lambdaNodeJS.NodejsFunction(this, "OrdersFunction", {
         functionName: "OrdersFunction",
         entry: "lambda/products/ordersFunction.ts",
         handler: "handler",
         memorySize: 128,
         timeout: cdk.Duration.seconds(5),
         bundling: {
           minify: true,
           sourceMap: false
         },
         environment: {
           PRODUCTS_DDB: props.productsDdb.tableName,
           ORDERS_DDB: ordersDdb.tableName
         },
         layers: [ordersLayer, productsLayer, ordersApiLayer],
         tracing: lambda.Tracing.ACTIVE,
         insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
       })
    
    ordersDdb.grantReadWriteData(this.ordersHandler)
    props.productsDdb.grantReadData(this.ordersHandler)
  }
}