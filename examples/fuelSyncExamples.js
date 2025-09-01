/**
 * Example usage of the Fuel Data Synchronization Service
 *
 * This file demonstrates various ways to interact with the fuel sync service
 * both programmatically and via HTTP requests.
 */

import FuelDataCronService from "./services/fuelDataCronService.js";
import axios from "axios";

// ====================================
// Example 1: Programmatic Usage
// ====================================

const example1_ProgrammaticUsage = async () => {
  console.log("🔧 Example 1: Programmatic Usage");

  const fuelService = new FuelDataCronService();

  // Start the cron service (runs daily at 2 AM)
  fuelService.start("0 2 * * *", {
    startId: 0,
    endId: 1000, // Smaller range for testing
    batchSize: 50,
  });

  // Check status
  const status = fuelService.getStatus();
  console.log("Status:", status);

  // Run immediately for testing (smaller range)
  await fuelService.runFuelDataSync({
    startId: 0,
    endId: 10, // Very small range for quick test
    batchSize: 5,
  });

  // Stop after testing
  setTimeout(() => {
    fuelService.stop();
    console.log("Service stopped");
  }, 30000); // Stop after 30 seconds
};

// ====================================
// Example 2: HTTP API Usage
// ====================================

const example2_HttpApiUsage = async () => {
  console.log("🌐 Example 2: HTTP API Usage");

  const baseURL = "http://localhost:3000/api/fuel-sync";

  try {
    // Start the cron service
    const startResponse = await axios.post(`${baseURL}/start`, {
      cronExpression: "0 3 * * *", // Daily at 3 AM
      startId: 0,
      endId: 5000,
      batchSize: 100,
    });
    console.log("Start Response:", startResponse.data);

    // Check status
    const statusResponse = await axios.get(`${baseURL}/status`);
    console.log("Status:", statusResponse.data);

    // Run a sync immediately (for testing with small range)
    const runResponse = await axios.post(`${baseURL}/run-now`, {
      startId: 0,
      endId: 5, // Very small range for testing
      batchSize: 2,
    });
    console.log("Run Now Response:", runResponse.data);

    // Wait a bit and check status again
    setTimeout(async () => {
      const statusResponse2 = await axios.get(`${baseURL}/status`);
      console.log("Status after run:", statusResponse2.data);
    }, 5000);
  } catch (error) {
    console.error("HTTP API Error:", error.response?.data || error.message);
  }
};

// ====================================
// Example 3: Different Cron Schedules
// ====================================

const example3_CronSchedules = () => {
  console.log("⏰ Example 3: Different Cron Schedules");

  const fuelService = new FuelDataCronService();

  // Different schedule examples:

  // Every hour
  // fuelService.start('0 * * * *');

  // Every 6 hours
  // fuelService.start('0 */6 * * *');

  // Every day at 3:30 AM
  // fuelService.start('30 3 * * *');

  // Every Sunday at 2 AM
  // fuelService.start('0 2 * * 0');

  // Every first day of the month at 1 AM
  // fuelService.start('0 1 1 * *');

  console.log("Various cron schedule examples shown above (commented out)");
};

// ====================================
// Example 4: Production Configuration
// ====================================

const example4_ProductionConfig = () => {
  console.log("🏭 Example 4: Production Configuration");

  const fuelService = new FuelDataCronService();

  // Production-ready configuration
  fuelService.start("0 2 * * *", {
    // Daily at 2 AM
    startId: 0,
    endId: 49130, // Full range
    batchSize: 200, // Larger batches for better performance
  });

  // Set up error monitoring
  setInterval(() => {
    const status = fuelService.getStatus();

    if (status.stats.failedRuns > 0) {
      console.error("⚠️  Failed runs detected:", status.stats);
      // In production, you might want to send alerts here
    }

    if (status.isRunning) {
      console.log("📊 Sync in progress...");
    }
  }, 60000); // Check every minute

  console.log("Production configuration applied");
};

// ====================================
// Example 5: Monitoring and Alerts
// ====================================

const example5_MonitoringAlerts = async () => {
  console.log("📈 Example 5: Monitoring and Alerts");

  const baseURL = "http://localhost:3000/api/fuel-sync";

  const monitorService = async () => {
    try {
      const statusResponse = await axios.get(`${baseURL}/status`);
      const status = statusResponse.data;

      // Check for issues
      if (status.stats.failedRuns > status.stats.successfulRuns * 0.1) {
        console.warn("🚨 High failure rate detected!");
        // Send alert to monitoring system
      }

      if (status.isRunning) {
        console.log("✅ Sync is running normally");
      }

      // Log statistics
      console.log(
        `📊 Total: ${status.stats.totalRuns}, Success: ${status.stats.successfulRuns}, Failed: ${status.stats.failedRuns}`
      );
    } catch (error) {
      console.error("❌ Monitoring error:", error.message);
      // Send alert about monitoring failure
    }
  };

  // Monitor every 5 minutes
  setInterval(monitorService, 5 * 60 * 1000);

  console.log("Monitoring started (every 5 minutes)");
};

// ====================================
// Run Examples (uncomment to test)
// ====================================

// Example 1: Basic programmatic usage
// example1_ProgrammaticUsage();

// Example 2: HTTP API usage (requires server to be running)
// example2_HttpApiUsage();

// Example 3: Show different cron schedules
example3_CronSchedules();

// Example 4: Production configuration
// example4_ProductionConfig();

// Example 5: Monitoring setup
// example5_MonitoringAlerts();

console.log(`
🎯 Fuel Data Sync Service Examples Loaded!

To test different examples:
1. Make sure your server is running (npm start)
2. Uncomment the example functions you want to test
3. Run this file: node examples/fuelSyncExamples.js

Available HTTP endpoints:
- POST /api/fuel-sync/start
- POST /api/fuel-sync/run-now  
- GET  /api/fuel-sync/status
- GET  /api/fuel-sync/stats
- POST /api/fuel-sync/stop

Cron expressions:
- '0 2 * * *'   = Daily at 2 AM
- '0 */6 * * *' = Every 6 hours
- '0 2 * * 0'   = Every Sunday at 2 AM
- '0 1 1 * *'   = Monthly on 1st at 1 AM
`);
