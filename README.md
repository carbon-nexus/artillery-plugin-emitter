# artillery-plugin-emitter
An artillery plugin that will send artillery events to a variety of event brokers (ie AWS SNS, AWS Kinesis, etc)

## Current Broker Support
* AWS SNS

## Setup
Before sending events emitted from Artillery to a designated broker, users are required to update their environments in accordance to the corresponding vendor (ie AWS, GCP, Azure, etc).

### Artillery script setup
To enable Artillery to use this plugin, users need to run the below:
* `npm install -g artillery-plugin-emitter`

The below are available plugin configuration parameters:
```typescript
export interface BrokerEmitterConfig {
    vendor: "aws",
    broker: "sns",
    type?: string,
    sns?: SnsBrokerEmitter,
    loggingLevel?: "silly" | "debug" | "verbose" | "http" | "info" | "warn" | "error"
}

export interface SnsBrokerEmitter {
    arn: string
}
```

#### Sample Config Script

```yml
config:
  target: "https://www.artillery-plugin-sample.com"
  phases:
    - duration: 1
      arrivalRate: 1
  tls:
    rejectUnauthorized: false
  plugins:
    emitter:
      loggingLevel: silly
      broker: sns
      vendor: aws
      type: stress
      sns:
        arn: arn:aws:sns:us-east-1:1234567890:artillery-test
```

> Note: Adding a config `type` key will change the event emitted to be `<artillery-event>.<type>`. For example, when doing a stress type, the done event will now emit `done.stress` to external brokers.

### AWS Setup
For AWS Setup, the below environment variables need to be configured:
* AWS_ACCESS_KEY_ID
* AWS_SECRET_ACCESS_KEY

> To change the default region (ie us-east-1), `AWS_DEFAULT_REGION` can be configured

## Consuming Events
Events can be consumed by subscribing to the corresponding broker, then handling such according to the broker documentation

### AWS SNS
All events will be published to a provided AWS SNS Topic ARN. Consuming applications can filter based on the below message attributes:
```typescript
{
    "type": "phaseStarted" | "phaseCompleted" | "stats" | "done",
    "source": "artillery"
}
```