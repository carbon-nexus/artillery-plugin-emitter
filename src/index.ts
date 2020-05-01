import { BrokerEmitterConfig, ArtilleryEventEmitter, BrokerEventAttributes, ArtilleryConfigParam } from './interfaces/broker-emitter';
import { BrokerEmitterError } from './errors/broker-emitter';

import winston, { Logger } from 'winston';
import { once, EventEmitter } from 'events';
import { Credentials, SNS } from 'aws-sdk';
import { PublishInput } from 'aws-sdk/clients/sns';

//config.plugins.statsd
export class Plugin {
    public config: BrokerEmitterConfig;
    private creds: Credentials;
    private sns: SNS;
    private logger: Logger;
    private region: string;
    private doneEventPromise: Promise<any>;

    constructor(params: ArtilleryConfigParam, ee: EventEmitter) {
        this.config = params.config.plugins.emitter;
        this.setupLogger();
        this.logger.debug(`received config: ${JSON.stringify(this.config, null, 4)}`)
        if (this.config.vendor === "aws") this.validateAwsSetup();
        this.setupSubscriptions(ee);
    }

    async cleanup(next: () => {}) {
        await this.doneEventPromise;
        this.logger.silly("finished sending 'done' event data");
        next();
    }

    emit(data: any, attributes: BrokerEventAttributes) {
        this.logger.silly('attempting to emit event to defined broker');
        this.logger.debug(`data = ${JSON.stringify(data, null, 4)}`)
        this.logger.debug(`emitting for source = ${attributes.source} type = ${attributes.type}`);
        if (this.config.vendor === "aws") return this.emitAws(data, attributes);
        else {
            this.handleError(`No current support for emitting event to vender='${this.config.vendor}'`);
        }
    }

    emitAws(data: any, attributes: BrokerEventAttributes) {
        this.logger.silly("determining which AWS broker to send the event to");
        if (this.config.broker === "sns") return this.emitAwsSns(data, attributes);
        else {
            this.handleError(`No current support for emitting event to broker='${this.config.broker}'`)
        }
    }

    emitAwsSns(data: any, attributes: BrokerEventAttributes) {
        this.logger.silly("attempting to send event to AWS SNS")
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
        this.logger.debug(`AWS SNS params: ${JSON.stringify(params,null,4)}`)
        return this.sns.publish(params).promise().catch(this.handleError.bind(this));
    }

    handleError(message: string) {
        this.logger.error(message);
        throw new BrokerEmitterError(message);
    }

    async handleDoneEvent(data: any) {
        this.logger.silly("sending 'done' event data");
        let type = this.config.type ? `done.${this.config.type}` : 'done';
        this.doneEventPromise = this.emit(data, {
            type,
            source: 'artillery'
        });
    }

    async handleStatsEvent(data: any) {
        this.logger.silly("sending 'stats' event data");
        let type = this.config.type ? `stats.${this.config.type}` : 'stats';
        await this.emit(data, {
            type,
            source: 'artillery'
        });
        this.logger.silly("finished sending 'stats' event data");
    }

    async handlePhaseCompletedEvent(data: any) {
        this.logger.silly("sending 'phaseCompleted' event data");
        let type = this.config.type ? `phaseCompleted.${this.config.type}` : 'phaseCompleted';
        await this.emit(data, {
            type,
            source: 'artillery'
        });
        this.logger.silly("finished sending 'phaseCompleted' event data");
    }

    async handlePhaseStartedEvent(data: any) {
        this.logger.silly("sending 'phaseStarted' event data");
        let type = this.config.type ? `phaseStarted.${this.config.type}` : 'phaseStarted';
        await this.emit(data, {
            type,
            source: 'artillery'
        });
        this.logger.silly("finished sending 'phaseStarted' event data");
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: this.config.loggingLevel || 'info',
            transports: [
                new winston.transports.Console()
            ]
        });
    }

    async setupSubscriptions(ee: EventEmitter) {
        ee.on('phaseStarted', this.handlePhaseStartedEvent.bind(this));
        ee.on('phaseCompleted', this.handlePhaseCompletedEvent.bind(this));
        ee.on('stats', this.handleStatsEvent.bind(this));
        ee.on('done', this.handleDoneEvent.bind(this));
    }

    validateAwsSetup(): void {
        // Validate Access Credentials are set
        this.logger.silly('attempting to validate AWS setup');
        this.logger.silly('validating credentials are setup properly');
        if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY) {
            this.handleError('Need to define both environment variables [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]');
        } else {
            this.creds = new Credentials({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            });
            this.logger.debug(`using creds: \n\taccess_key_id=${this.creds.accessKeyId}\n\tsecret_access_key=${this.creds.secretAccessKey}`);
        }

        // Set AWS Region if not found
        if(!process.env.AWS_DEFAULT_REGION) {
            this.logger.warn("AWS_DEFAULT_REGION environment variable not set, using us-east-1");
            this.region = 'us-east-1';
        } else {
            this.region = process.env.AWS_DEFAULT_REGION;
        }
        this.logger.debug(`using region ${this.region}`);

        // Validate SNS Broker
        if (this.config.broker === "sns") {
            this.logger.silly('validating SNS configuration');
            if (!this.config.sns.arn) {
                this.handleError('Need to supply SNS Topic ARN to emit to')
            } else {
                this.sns = new SNS({ credentials: this.creds, region: this.region });
            }
        }
    }
}