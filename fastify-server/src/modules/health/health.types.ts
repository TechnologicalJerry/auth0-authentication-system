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
  };
  timestamp: string;
}

