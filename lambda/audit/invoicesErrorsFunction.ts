import { Context, EventBridgeEvent } from 'aws-lambda';


export async function handler(event: EventBridgeEvent<string, string>, context: Context): Promise<void> {
  console.log("Event received: ", JSON.stringify(event, null, 2))
  console.log("Context received: ", JSON.stringify(context, null, 2))
}