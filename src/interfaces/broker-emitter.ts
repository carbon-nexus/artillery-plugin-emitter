export interface ArtilleryConfig {
    plugins: ArtilleryPlugins
}

export interface ArtilleryPlugins {
    emitter: BrokerEmitterConfig
}

export interface BrokerEmitterConfig {
    vendor: "aws",
    broker: "sns",
    sns?: SnsBrokerEmitter,
    loggingLevel?: "silly" | "debug" | "verbose" | "http" | "info" | "warn" | "error"
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