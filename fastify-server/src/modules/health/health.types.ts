export interface BasicHealthResponse {
  appName: string;
  version: string;
  environment: string;
  status: 'healthy';
  timestamp: string;
}

export interface LivenessResponse {
  status: 'live';
  uptimeSeconds: number;
  memoryUsage: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  timestamp: string;
}

export interface ReadinessResponse {
  ready: boolean;
  status: 'ready' | 'not_ready';
  components: {
    database: { status: 'healthy' | 'unhealthy' };
    redis: { status: 'healthy' | 'unhealthy' };
  };
  timestamp: string;
}

export interface DependenciesResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  dependencies: {
    database: {
      provider: 'postgresql';
      status: 'healthy' | 'unhealthy';
      latencyMs: number;
    };
    redis: {
      provider: 'redis';
      status: 'healthy' | 'unhealthy';
      latencyMs: number;
    };
    auth0: {
      provider: 'auth0';
      status: 'configured';
      domain: string;
      audience: string;
      note: string;
    };
  };
  timestamp: string;
}
