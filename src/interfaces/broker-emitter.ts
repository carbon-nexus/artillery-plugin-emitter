export interface BrokerEmitterConfig {
    broker: "aws"
}

export interface ArtilleryEventEmitter {
    on: (event: string) => void;
}