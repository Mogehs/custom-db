import express from "express";
import FuelDataCronService from "../services/fuelDataCronService.js";

const router = express.Router();

// Create a singleton instance to be shared across routes
let fuelDataCronService;

const getFuelDataCronService = () => {
  if (!fuelDataCronService) {
    fuelDataCronService = new FuelDataCronService();
  }
  return fuelDataCronService;
};

/**
 * Start the fuel data cron service
 * POST /api/fuel-sync/start
 * Body: {
 *   cronExpression?: string,  // Default: '0 2 * * *' (daily at 2 AM)
 *   startId?: number,         // Default: 0
 *   endId?: number           // Default: 49130
 * }
 */
router.post("/start", async (req, res) => {
  try {
    const {
      cronExpression = "0 2 * * *", // Default: daily at 2 AM
      startId = 0,
      endId = 49130,
    } = req.body;

    const service = getFuelDataCronService();
    service.start(cronExpression, { startId, endId });

    res.status(200).json({
      message: "Fuel data cron service started successfully",
      schedule: cronExpression,
      range: { startId, endId },
      processingMode: "bulk_insert",
      dataInjection: "automatic_after_completion",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error starting fuel data cron service:", error);
    res.status(500).json({
      error: "Error starting fuel data cron service",
      details: error.message,
    });
  }
});

/**
 * Run fuel data sync immediately
 * POST /api/fuel-sync/run-now
 * Body: {
 *   startId?: number,         // Default: 0
 *   endId?: number           // Default: 49130
 * }
 */
router.post("/run-now", async (req, res) => {
  try {
    const { startId = 0, endId = 49130 } = req.body;

    const service = getFuelDataCronService();

    // Check if already running
    const status = service.getStatus();
    if (status.isRunning) {
      return res.status(409).json({
        error: "Fuel data synchronization is already running",
        status,
      });
    }

    // Run the sync immediately (non-blocking)
    service.runFuelDataSync({ startId, endId });

    res.status(200).json({
      message: "Fuel data synchronization started",
      range: { startId, endId },
      processingMode: "bulk_insert",
      dataInjection: "automatic_after_completion",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error running fuel data sync:", error);
    res.status(500).json({
      error: "Error running fuel data sync",
      details: error.message,
    });
  }
});

/**
 * Get fuel data sync status
 * GET /api/fuel-sync/status
 */
router.get("/status", (req, res) => {
  try {
    const service = getFuelDataCronService();
    const status = service.getStatus();

    res.status(200).json({
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting fuel sync status:", error);
    res.status(500).json({
      error: "Error getting fuel sync status",
      details: error.message,
    });
  }
});

/**
 * Stop the fuel data cron service
 * POST /api/fuel-sync/stop
 */
router.post("/stop", (req, res) => {
  try {
    const service = getFuelDataCronService();
    service.stop();

    res.status(200).json({
      message: "Fuel data cron service stopped",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error stopping fuel data cron service:", error);
    res.status(500).json({
      error: "Error stopping fuel data cron service",
      details: error.message,
    });
  }
});

/**
 * Get fuel data sync statistics
 * GET /api/fuel-sync/stats
 */
router.get("/stats", (req, res) => {
  try {
    const service = getFuelDataCronService();
    const status = service.getStatus();

    res.status(200).json({
      stats: status.stats,
      lastRunTime: status.lastRunTime,
      nextRunTime: status.nextRunTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting fuel sync stats:", error);
    res.status(500).json({
      error: "Error getting fuel sync stats",
      details: error.message,
    });
  }
});

export default router;
export { getFuelDataCronService };
