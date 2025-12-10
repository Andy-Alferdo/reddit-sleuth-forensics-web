/**
 * BaseService - Abstract base class for all services
 * Implements common functionality using OOP principles
 */
export abstract class BaseService {
  protected serviceName: string;
  protected isInitialized: boolean = false;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Initialize the service
   */
  protected async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log(`${this.serviceName} initialized`);
  }

  /**
   * Log service activity
   */
  protected log(message: string, data?: any): void {
    console.log(`[${this.serviceName}] ${message}`, data || '');
  }

  /**
   * Handle errors uniformly across services
   */
  protected handleError(error: any, context: string): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${this.serviceName}] Error in ${context}:`, errorMessage);
    throw new Error(`${context}: ${errorMessage}`);
  }

  /**
   * Get service name
   */
  public getServiceName(): string {
    return this.serviceName;
  }

  /**
   * Check if service is ready
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}
