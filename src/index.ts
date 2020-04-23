import { BrokerEmitterConfig, ArtilleryEventEmitter, BrokerEventAttributes, ArtilleryConfig } from './interfaces/broker-emitter';
import { BrokerEmitterError } from './errors/broker-emitter';

import { Credentials, SNS } from 'aws-sdk';
import { PublishInput } from 'aws-sdk/clients/sns';

//config.plugins.statsd
class BrokerEmitter {
    public config: BrokerEmitterConfig;
    private creds: Credentials;
    private sns: SNS;

    constructor(config: ArtilleryConfig, ee: ArtilleryEventEmitter) {
        this.config = config.plugins.emitter;
        if(this.config.vendor === "aws") this.validateAwsSetup();
        ee.on('phaseStarted', this.handlePhaseStartedEvent.bind(this));
        ee.on('phaseCompleted', this.handlePhaseCompletedEvent.bind(this));
        ee.on('stats', this.handleStatsEvent.bind(this));
        ee.on('done', this.handleDoneEvent.bind(this));
    }

    emit(data: any, attributes: BrokerEventAttributes) {
        if(this.config.vendor === "aws") this.emitAws(data, attributes);
        else throw new BrokerEmitterError(`No current support for emitting event to vender='${this.config.vendor}'`);
    }

    emitAws(data: any, attributes: BrokerEventAttributes) {
        if(this.config.broker === "sns") this.emitAwsSns(data, attributes);
        else  throw new BrokerEmitterError(`No current support for emitting event to broker='${this.config.broker}'`);
    }

    emitAwsSns(data: any, attributes: BrokerEventAttributes) {
        let params: PublishInput = {
            TopicArn: this.config.sns.arn,
            Message: JSON.stringify(data),
            MessageAttributes: {
                'type': {
                    DataType: 'String',
                    StringValue: attributes.type
                },
                'source': {
                    DataType: 'String',
                    StringValue: attributes.source
                }
            }
        }
        return this.sns.publish(params).promise();
    }

    async handleDoneEvent(data: any) { 
        await this.emit(data, {
            type: 'done',
            source: 'artillery'
        })
    }

    async handleStatsEvent(data: any) { 
        await this.emit(data, {
            type: 'stats',
            source: 'artillery'
        })
    }

    async handlePhaseCompletedEvent(data: any) { 
        await this.emit(data, {
            type: 'phaseCompleted',
            source: 'artillery'
        })
    }

    async handlePhaseStartedEvent(data: any) { 
        await this.emit(data, {
            type: 'phaseStarted',
            source: 'artillery'
        })
    }

    validateAwsSetup(): void {
        // Validate Access Credentials are set
        if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY) {
            throw new BrokerEmitterError('Need to define both environment variables [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]')
        } else {
            this.creds = new Credentials({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            })
        }
        // Validate SNS Broker
        if (this.config.broker === "sns") {
            if(!this.config.sns.arn) throw new BrokerEmitterError('Need to supply SNS Topic ARN to emit to');
            else {
                this.sns = new SNS({ credentials: this.creds });
            }
        }
    }

}

