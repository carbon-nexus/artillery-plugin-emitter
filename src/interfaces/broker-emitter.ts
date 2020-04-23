export interface BrokerEmitterConfig {
    vendor: "aws",
    broker: "sns",
    sns?: SnsBrokerEmitter,
    loggingLevel: number
}

export interface BrokerEventAttributes {
    type: string,
    source: string
}

export interface ArtilleryEventEmitter {
    on: (event: string, cb: (data: any)=>void ) => void;
}

export interface SnsBrokerEmitter {
    arn: string
}