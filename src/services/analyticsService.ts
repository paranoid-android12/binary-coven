/**
 * Analytics Service
 * Tracks quest progress, objectives, and code executions
 * Integrates with backend analytics APIs
 */

interface QuestProgressData {
  questId: string;
  questTitle: string;
  state: 'locked' | 'available' | 'active' | 'completed' | 'failed';
  currentPhaseIndex?: number;
  startedAt?: string;
  completedAt?: string;
  timeSpentSeconds?: number;
  attempts?: number;
  score?: number;
  phaseProgress?: any;
}

interface ObjectiveProgressData {
  questId: string;
  phaseId: string;
  objectiveIndex: number;
  objectiveDescription: string;
  completedAt?: string;
  attempts?: number;
  timeSpentSeconds?: number;
  hintsUsed?: number;
}

interface CodeExecutionData {
  questId?: string;
  phaseId?: string;
  codeWindowId: string;
  codeContent: string;
  executionResult: {
    success: boolean;
    errors?: any[];
    output?: string;
    executionTime?: number;
  };
  entityId?: string;
  executionDurationMs?: number;
}

interface QueuedRequest {
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
}

class AnalyticsService {
  private requestQueue: QueuedRequest[] = [];
  private isSending = false;
  private batchInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 2000; // 2 seconds
  private readonly MAX_RETRIES = 3;
  private readonly MAX_QUEUE_SIZE = 100;

  constructor() {
    // Start batch processing
    this.startBatchProcessor();

    // Load any queued requests from localStorage
    this.loadQueueFromStorage();
  }

  /**
   * Track when a quest is started
   */
  async trackQuestStart(questId: string, questTitle: string): Promise<void> {
    const data: QuestProgressData = {
      questId,
      questTitle,
      state: 'active',
      startedAt: new Date().toISOString(),
      attempts: 1,
    };

    await this.queueRequest('/api/analytics/quest-progress', data);
  }

  /**
   * Track when a quest is completed
   */
  async trackQuestComplete(
    questId: string,
    questTitle: string,
    timeSpentSeconds: number,
    attempts: number,
    score?: number
  ): Promise<void> {
    const data: QuestProgressData = {
      questId,
      questTitle,
      state: 'completed',
      completedAt: new Date().toISOString(),
      timeSpentSeconds,
      attempts,
      score,
    };

    await this.queueRequest('/api/analytics/quest-progress', data);
  }

  /**
   * Update quest progress (for phase changes, etc.)
   */
  async updateQuestProgress(
    questId: string,
    questTitle: string,
    state: 'locked' | 'available' | 'active' | 'completed' | 'failed',
    currentPhaseIndex?: number,
    phaseProgress?: any
  ): Promise<void> {
    const data: QuestProgressData = {
      questId,
      questTitle,
      state,
      currentPhaseIndex,
      phaseProgress,
    };

    await this.queueRequest('/api/analytics/quest-progress', data);
  }

  /**
   * Track objective completion
   */
  async trackObjectiveComplete(
    questId: string,
    phaseId: string,
    objectiveIndex: number,
    objectiveDescription: string,
    timeSpentSeconds: number,
    attempts: number = 1,
    hintsUsed: number = 0
  ): Promise<void> {
    const data: ObjectiveProgressData = {
      questId,
      phaseId,
      objectiveIndex,
      objectiveDescription,
      completedAt: new Date().toISOString(),
      attempts,
      timeSpentSeconds,
      hintsUsed,
    };

    await this.queueRequest('/api/analytics/objective-progress', data);
  }

  /**
   * Track code execution
   */
  async trackCodeExecution(
    codeWindowId: string,
    codeContent: string,
    executionResult: {
      success: boolean;
      errors?: any[];
      output?: string;
      executionTime?: number;
    },
    questId?: string,
    phaseId?: string,
    entityId?: string,
    executionDurationMs?: number
  ): Promise<void> {
    const data: CodeExecutionData = {
      questId,
      phaseId,
      codeWindowId,
      codeContent,
      executionResult,
      entityId,
      executionDurationMs,
    };

    await this.queueRequest('/api/analytics/code-execution', data);
  }

  /**
   * Queue a request for batch processing
   */
  private async queueRequest(endpoint: string, data: any): Promise<void> {
    // Check if queue is too large
    if (this.requestQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('Analytics queue is full, dropping oldest request');
      this.requestQueue.shift();
    }

    const request: QueuedRequest = {
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.requestQueue.push(request);
    this.saveQueueToStorage();
  }

  /**
   * Start the batch processor
   */
  private startBatchProcessor(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }

    this.batchInterval = setInterval(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process queued requests in batch
   */
  private async processBatch(): Promise<void> {
    if (this.isSending || this.requestQueue.length === 0) {
      return;
    }

    this.isSending = true;

    // Process up to 5 requests at a time
    const batch = this.requestQueue.splice(0, 5);
    const failedRequests: QueuedRequest[] = [];

    for (const request of batch) {
      try {
        const response = await fetch(request.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request.data),
          credentials: 'include',
        });

        if (!response.ok) {
          // If request failed, check if we should retry
          if (request.retries < this.MAX_RETRIES) {
            request.retries++;
            failedRequests.push(request);
            console.warn(`Analytics request failed, will retry (${request.retries}/${this.MAX_RETRIES}):`, request.endpoint);
          } else {
            console.error('Analytics request failed after max retries:', request.endpoint);
          }
        }
      } catch (error) {
        // Network error or offline - queue for retry
        if (request.retries < this.MAX_RETRIES) {
          request.retries++;
          failedRequests.push(request);
        } else {
          console.error('Analytics request failed after max retries (network error):', error);
        }
      }
    }

    // Re-add failed requests to the front of the queue
    if (failedRequests.length > 0) {
      this.requestQueue.unshift(...failedRequests);
    }

    this.saveQueueToStorage();
    this.isSending = false;
  }

  /**
   * Save queue to localStorage for persistence
   */
  private saveQueueToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('analyticsQueue', JSON.stringify(this.requestQueue));
      }
    } catch (error) {
      console.warn('Failed to save analytics queue to localStorage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueueFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('analyticsQueue');
        if (stored) {
          this.requestQueue = JSON.parse(stored);
          console.log(`Loaded ${this.requestQueue.length} queued analytics requests from storage`);
        }
      }
    } catch (error) {
      console.warn('Failed to load analytics queue from localStorage:', error);
    }
  }

  /**
   * Flush all pending requests immediately
   */
  async flush(): Promise<void> {
    while (this.requestQueue.length > 0) {
      await this.processBatch();
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Clear the queue (useful for logout)
   */
  clearQueue(): void {
    this.requestQueue = [];
    this.saveQueueToStorage();
  }

  /**
   * Stop the batch processor
   */
  stop(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
  }
}

// Export a singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;
