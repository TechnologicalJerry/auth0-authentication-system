export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  appName: string;
}

export interface LivenessStatus {
  status: 'ok';
  timestamp: string;
  uptime: number;
  memoryUsage: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
}

export interface ReadinessStatus {
  status: 'ready' | 'degraded' | 'not_ready';
  timestamp: string;
  database: 'connected' | 'disconnected';
  uptime: number;
}
