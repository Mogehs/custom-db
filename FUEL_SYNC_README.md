# Fuel Data Synchronization Service

This service provides automated background synchronization of vehicle fuel economy data using worker threads and cron scheduling to avoid impacting server performance.

## Features

- ⚡ **Worker Thread Processing**: Heavy data fetching runs in separate worker threads
- 🕒 **Cron Scheduling**: Automatic daily synchronization at 2 AM UTC
- 📊 **Progress Tracking**: Real-time progress updates and statistics
- 🛡️ **Error Handling**: Robust error handling with retry mechanisms
- 🔧 **Configurable**: Customizable batch sizes, ID ranges, and schedules
- 📈 **Monitoring**: REST API endpoints for monitoring and control

## Automatic Operation

The service automatically starts when your server boots up and runs daily at 2:00 AM UTC. No manual intervention required!

## API Endpoints

### Start Cron Service

```http
POST /api/fuel-sync/start
Content-Type: application/json

{
  "cronExpression": "0 2 * * *",  // Optional: Cron schedule (default: daily at 2 AM)
  "startId": 0,                   // Optional: Starting vehicle ID (default: 0)
  "endId": 49130,                // Optional: Ending vehicle ID (default: 49130)
  "batchSize": 100               // Optional: Batch size for database inserts (default: 100)
}
```

### Run Synchronization Immediately

```http
POST /api/fuel-sync/run-now
Content-Type: application/json

{
  "startId": 0,        // Optional: Starting vehicle ID
  "endId": 49130,     // Optional: Ending vehicle ID
  "batchSize": 100    // Optional: Batch size
}
```

### Check Status

```http
GET /api/fuel-sync/status
```

Response:

```json
{
  "isRunning": false,
  "lastRunTime": "2025-09-02T10:30:00.000Z",
  "nextRunTime": "2025-09-03T02:00:00.000Z",
  "stats": {
    "totalRuns": 5,
    "successfulRuns": 4,
    "failedRuns": 1,
    "lastError": null
  },
  "hasActiveWorker": false,
  "timestamp": "2025-09-02T15:45:00.000Z"
}
```

### Get Statistics

```http
GET /api/fuel-sync/stats
```

### Stop Service

```http
POST /api/fuel-sync/stop
```

## Cron Expression Examples

| Expression    | Description                         |
| ------------- | ----------------------------------- |
| `0 2 * * *`   | Daily at 2:00 AM                    |
| `0 */6 * * *` | Every 6 hours                       |
| `0 2 * * 0`   | Every Sunday at 2:00 AM             |
| `0 2 1 * *`   | First day of every month at 2:00 AM |

## Performance Features

### Worker Threads

- Runs in separate thread to avoid blocking main server
- Isolated memory space prevents memory leaks
- Automatic error recovery and cleanup

### Batch Processing

- Configurable batch sizes (default: 100 records)
- Memory-efficient processing
- Progress tracking per batch

### Rate Limiting

- 50ms delay between API calls to prevent overwhelming external API
- Configurable timeouts (10 seconds per request)
- Automatic retry on failures

## Monitoring and Logging

The service provides comprehensive logging:

```
🚀 Fuel data synchronization service started
🕒 Scheduled to run daily at 2:00 AM UTC
📈 Progress: 25.5% (12500/49130) - Toyota Camry 2023
💾 Batch inserted: 100 vehicles up to ID 12600
✅ All data fetched and stored successfully
📊 Fuel Data Sync Statistics:
   Total runs: 5
   Successful runs: 4
   Failed runs: 1
   Last run: 2025-09-02T10:30:00.000Z
   Next run: 2025-09-03T02:00:00.000Z
```

## Error Handling

- **Network Errors**: Automatic retry with exponential backoff
- **Database Errors**: Continues processing even if some inserts fail
- **Worker Crashes**: Automatic cleanup and error reporting
- **Duplicate Data**: Uses `ordered: false` to continue on duplicate key errors

## Environment Variables

Make sure these are set in your `.env` file:

```env
GET_FUEL_VEHICLES_API_URL=https://your-fuel-api-url.com/vehicles
MONGODB_URI=mongodb://localhost:27017/your-database
# or
DB_URI=mongodb://localhost:27017/your-database
```

## Production Considerations

1. **Database Indexing**: Ensure proper indexes on frequently queried fields
2. **Memory Monitoring**: Monitor worker thread memory usage
3. **API Rate Limits**: Respect external API rate limits
4. **Disk Space**: Monitor disk space for large datasets
5. **Backup Strategy**: Regular database backups before major syncs

## Troubleshooting

### Common Issues

1. **Worker Thread Fails to Start**

   - Check if `GET_FUEL_VEHICLES_API_URL` environment variable is set
   - Verify database connection

2. **High Memory Usage**

   - Reduce batch size in configuration
   - Monitor worker thread lifecycle

3. **API Rate Limiting**
   - Increase delay between requests in worker
   - Check external API documentation for limits

### Debug Mode

Set `NODE_ENV=development` for more verbose logging.

## File Structure

```
services/
  fuelDataCronService.js     # Main cron service management
workers/
  fuelDataWorker.js          # Worker thread for data processing
routes/
  fuelSync.routes.js         # REST API endpoints
utils/
  fuelEconomyFunction.js     # Original function (legacy)
```

## Migration from Legacy Function

The original `fetchAndStoreVehicles` function in `utils/fuelEconomyFunction.js` is now superseded by this worker-based system. The new system provides:

- Better performance isolation
- Automatic scheduling
- Progress monitoring
- Error recovery
- REST API control

The legacy function is kept for reference but should not be used directly in production.
