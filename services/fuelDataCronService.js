import cron from "node-cron";
import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FuelDataCronService {
  constructor() {
    this.isRunning = false;
    this.currentWorker = null;
    this.lastRunTime = null;
    this.nextRunTime = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastError: null,
    };
  }

  /**
   * Start the cron job
   * @param {string} cronExpression - Cron expression (default: run daily at 2 AM)
   * @param {object} options - Worker options
   */
  start(cronExpression = "0 2 * * *", options = {}) {
    const { startId = 0, endId = 49130 } = options;

    console.log(
      `🕒 Fuel Data Cron Service started with schedule: ${cronExpression}`
    );
    console.log(
      `📊 Will process vehicles from ID ${startId} to ${endId} (bulk insert)`
    );

    // Schedule the task
    this.cronJob = cron.schedule(
      cronExpression,
      () => {
        this.runFuelDataSync({ startId, endId });
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    // Calculate next run time
    this.updateNextRunTime(cronExpression);
    console.log(`⏰ Next run scheduled for: ${this.nextRunTime}`);
  }

  /**
   * Run the fuel data synchronization manually
   */
  async runFuelDataSync(options = {}) {
    if (this.isRunning) {
      console.log(
        "⚠️  Fuel data sync is already running. Skipping this execution."
      );
      return;
    }

    const { startId = 0, endId = 49130 } = options;

    this.isRunning = true;
    this.lastRunTime = new Date();
    this.stats.totalRuns++;

    console.log(
      `🚀 Starting fuel data synchronization at ${this.lastRunTime.toISOString()}`
    );
    console.log(`📊 Processing vehicles from ID ${startId} to ${endId}`);

    try {
      const workerPath = path.join(__dirname, "../workers/fuelDataWorker.js");

      this.currentWorker = new Worker(workerPath, {
        workerData: { startId, endId },
      });

      // Handle worker messages
      this.currentWorker.on("message", (message) => {
        switch (message.type) {
          case "progress":
            const progress = (
              ((message.current - startId) / (endId - startId)) *
              100
            ).toFixed(2);
            console.log(
              `📈 Progress: ${progress}% (${message.current}/${endId}) - ${message.vehicleInfo}`
            );
            break;

          case "bulk_inserted":
            console.log(
              `💾 Bulk insert completed: ${message.totalCount} vehicles (IDs ${message.range.startId}-${message.range.endId})`
            );
            break;

          case "injection_completed":
            console.log(`🎯 ${message.message}`);
            break;

          case "injection_error":
            console.error(`⚠️  Data injection error: ${message.error}`);
            break;

          case "completed":
            console.log(`✅ ${message.message}`);
            break;

          case "error":
            console.error(`❌ Worker error: ${message.error}`);
            this.stats.lastError = message.error;
            break;
        }
      });

      // Handle worker completion
      this.currentWorker.on("exit", (code) => {
        if (code === 0) {
          console.log(`🎉 Fuel data synchronization completed successfully`);
          this.stats.successfulRuns++;
        } else {
          console.error(`💥 Worker stopped with exit code ${code}`);
          this.stats.failedRuns++;
          this.stats.lastError = `Worker exited with code ${code}`;
        }

        this.isRunning = false;
        this.currentWorker = null;
        this.printStats();
      });

      // Handle worker errors
      this.currentWorker.on("error", (error) => {
        console.error(`💥 Worker error:`, error);
        this.stats.failedRuns++;
        this.stats.lastError = error.message;
        this.isRunning = false;
        this.currentWorker = null;
      });
    } catch (error) {
      console.error(`💥 Failed to start worker:`, error);
      this.stats.failedRuns++;
      this.stats.lastError = error.message;
      this.isRunning = false;
    }
  }

  /**
   * Stop the cron service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log("Fuel Data Cron Service stopped");
    }

    if (this.currentWorker) {
      this.currentWorker.terminate();
      console.log("Current worker terminated");
      this.isRunning = false;
      this.currentWorker = null;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.nextRunTime,
      stats: { ...this.stats },
      hasActiveWorker: this.currentWorker !== null,
    };
  }

  /**
   * Print service statistics
   */
  printStats() {
    console.log("\n📊 Fuel Data Sync Statistics:");
    console.log(`   Total runs: ${this.stats.totalRuns}`);
    console.log(`   Successful runs: ${this.stats.successfulRuns}`);
    console.log(`   Failed runs: ${this.stats.failedRuns}`);
    console.log(
      `   Last run: ${
        this.lastRunTime ? this.lastRunTime.toISOString() : "Never"
      }`
    );
    console.log(`   Next run: ${this.nextRunTime || "Not scheduled"}`);
    if (this.stats.lastError) {
      console.log(`   Last error: ${this.stats.lastError}`);
    }
    console.log("");
  }

  /**
   * Update next run time calculation
   */
  updateNextRunTime(cronExpression) {
    try {
      // This is a simplified calculation - in production you might want to use a proper cron parser
      if (cronExpression === "0 2 * * *") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(2, 0, 0, 0);
        this.nextRunTime = tomorrow.toISOString();
      } else {
        this.nextRunTime = "See cron schedule";
      }
    } catch (error) {
      this.nextRunTime = "Unable to calculate";
    }
  }
}

export default FuelDataCronService;
