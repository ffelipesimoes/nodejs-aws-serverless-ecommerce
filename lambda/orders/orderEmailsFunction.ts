import { Context , SQSEvent} from "aws-lambda"
import * as AWSRay from "aws-xray-sdk"

AWSRay.captureAWS(require("aws-sdk"))

export async function handler(event: SQSEvent, context: Context): Promise<void> {
  event.Records.forEach((record) => {
    console.log(record)
    const body = JSON.parse(record.body)
    console.log(body)
  })
  return
}