import ChargeLab from "../models/ChargeLab.js";
import {
  normalizeVehicleData,
  fieldMap,
} from "../utils/mapping-normalization.js";
import fetchAndStoreVehicles from "../utils/fuelEconomyFunction.js";

const deepMergePreserve = (existing, incoming) => {
  for (const key in incoming) {
    if (
      incoming[key] &&
      typeof incoming[key] === "object" &&
      !Array.isArray(incoming[key])
    ) {
      if (!existing[key]) existing[key] = {};
      deepMergePreserve(existing[key], incoming[key]);
    } else if (incoming[key] !== undefined && incoming[key] !== null) {
      existing[key] = incoming[key];
    }
  }
  return existing;
};

// Function to detect wheel size from model name
const detectWheelSize = (modelName) => {
  if (!modelName || typeof modelName !== "string") {
    return null;
  }
  const wheelSizeRegex = /\((\d+)\s*inch\s*wheels?\)/i;
  const match = modelName.match(wheelSizeRegex);
  return match ? `${match[1]} inch` : null;
};

// Function to extract base model name (remove wheel size info)
const extractBaseModel = (modelName) => {
  if (!modelName || typeof modelName !== "string") {
    return "";
  }
  return modelName.replace(/\s*\((\d+)\s*inch\s*wheels?\)/i, "").trim();
};

// Function to sanitize numeric fields that might come as strings or ranges
const sanitizeNumericValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // If it's already a number, return it
  if (typeof value === "number") {
    return value;
  }

  // Convert to string and handle range values like "96-104"
  const stringValue = value.toString().trim();

  // Check if it's a range (contains dash)
  if (stringValue.includes("-")) {
    const parts = stringValue.split("-");
    const firstNum = parseFloat(parts[0]);
    const secondNum = parseFloat(parts[1]);

    // Return average of the range
    if (!isNaN(firstNum) && !isNaN(secondNum)) {
      return (firstNum + secondNum) / 2;
    }
  }

  // Try to parse as a regular number
  const parsedValue = parseFloat(stringValue);
  return isNaN(parsedValue) ? null : parsedValue;
};

// Function to sanitize range object
const sanitizeRangeData = (rangeData) => {
  if (!rangeData || typeof rangeData !== "object") {
    return {};
  }

  const sanitized = {};

  // List of numeric fields in range
  const numericFields = [
    "electric_only_range",
    "range",
    "range_city",
    "range_highway",
    "alternative_fuel_economy_city",
    "city08",
    "alternative_fuel_economy_highway",
    "highway08",
    "alternative_fuel_economy_combined",
    "comb08",
  ];

  for (const [key, value] of Object.entries(rangeData)) {
    if (numericFields.includes(key)) {
      sanitized[key] = sanitizeNumericValue(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Function to sanitize charging data
const sanitizeChargingData = (chargingData) => {
  if (!chargingData || typeof chargingData !== "object") {
    return {};
  }

  const sanitized = {};

  // List of numeric fields in charging
  const numericFields = [
    "charging_rate_level_2",
    "charging_speed_level_2",
    "charging_rate_DC_fast",
    "charging_speed_DC_fast",
  ];

  for (const [key, value] of Object.entries(chargingData)) {
    if (numericFields.includes(key)) {
      sanitized[key] = sanitizeNumericValue(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

export const addToChargeLabs = async (vehiclesData) => {
  for (const rawVehicle of vehiclesData) {
    const normalized = normalizeVehicleData(rawVehicle, fieldMap);

    // Detect wheel size from model name
    const wheelSize = detectWheelSize(normalized.vehicle.model);
    const baseModel = extractBaseModel(normalized.vehicle.model);

    // Set the base model for consistent storage
    normalized.vehicle.baseModel = baseModel;
    normalized.vehicle.model = baseModel; // Store clean model name

    // Sanitize range and charging data
    const sanitizedRange = sanitizeRangeData(normalized.range);
    const sanitizedCharging = sanitizeChargingData(normalized.charging);

    // Find existing vehicle by make + base model + year
    const existingVehicle = await ChargeLab.findOne({
      "vehicle.make": normalized.vehicle.make,
      "vehicle.model": baseModel,
      "vehicle.year": normalized.vehicle.year,
    });

    if (existingVehicle) {
      // Vehicle exists - add wheel variant or merge base data
      if (wheelSize) {
        // This has wheel size info - add to wheels array
        const wheelVariant = {
          size: wheelSize,
          range: sanitizedRange,
          charging: sanitizedCharging,
        };

        // Check if this wheel size already exists
        const existingWheelIndex = existingVehicle.wheels.findIndex(
          (w) => w.size === wheelSize
        );

        if (existingWheelIndex >= 0) {
          // Update existing wheel variant
          deepMergePreserve(
            existingVehicle.wheels[existingWheelIndex],
            wheelVariant
          );
        } else {
          // Add new wheel variant
          existingVehicle.wheels.push(wheelVariant);
        }
      } else {
        // This is NREL base vehicle data (no wheel size) - add as "default" size
        const defaultWheelVariant = {
          size: "default",
          range: sanitizedRange,
          charging: sanitizedCharging,
        };

        // Check if default size already exists
        const existingDefaultIndex = existingVehicle.wheels.findIndex(
          (w) => w.size === "default"
        );

        if (existingDefaultIndex >= 0) {
          // Update existing default variant
          deepMergePreserve(
            existingVehicle.wheels[existingDefaultIndex],
            defaultWheelVariant
          );
        } else {
          // Add new default variant
          existingVehicle.wheels.push(defaultWheelVariant);
        }

        // Merge other vehicle data (exclude range and charging since they're now in wheels)
        const { range, charging, wheels, ...otherData } = normalized;
        deepMergePreserve(existingVehicle, otherData);
      }

      await existingVehicle.save();
      console.log(
        `Updated vehicle ${normalized.vehicle.make} ${baseModel}${
          wheelSize ? ` with ${wheelSize} wheels` : " with default range data"
        }`
      );
    } else {
      // Create new vehicle
      // Always store the base model name (without wheel size)
      if (wheelSize) {
        // If it has wheel size, create wheels array with specific wheel data
        normalized.wheels = [
          {
            size: wheelSize,
            range: sanitizedRange,
            charging: sanitizedCharging,
          },
        ];
      } else {
        // NREL data without wheel size - store as "default" size
        normalized.wheels = [
          {
            size: "default",
            range: sanitizedRange,
            charging: sanitizedCharging,
          },
        ];
      }

      // Remove range and charging from main object since it's now in wheels
      delete normalized.range;
      delete normalized.charging;

      await ChargeLab.create(normalized);
      console.log(
        `Added vehicle ${normalized.vehicle.make} ${baseModel}${
          wheelSize ? ` with ${wheelSize} wheels` : " with default range data"
        }`
      );
    }
  }
};

export const updateIfExistsInChargeLabs = async (vehiclesData) => {
  for (const rawVehicle of vehiclesData) {
    // Handle the Fuel collection data structure directly
    const fuelVehicle = {
      make: rawVehicle.make,
      model: rawVehicle.model || rawVehicle.baseModel,
      year: rawVehicle.year?.toString(),
    };

    // Skip if essential fields are missing
    if (!fuelVehicle.make || !fuelVehicle.model || !fuelVehicle.year) {
      console.log(
        `Skipping — Missing essential data: ${fuelVehicle.make || "Unknown"} ${
          fuelVehicle.model || "Unknown"
        } ${fuelVehicle.year || "Unknown"}`
      );
      continue;
    }

    // Detect wheel size from model name
    const wheelSize = detectWheelSize(fuelVehicle.model);
    const baseModel = extractBaseModel(fuelVehicle.model);

    console.log(
      `Looking for: ${fuelVehicle.make} ${baseModel} ${fuelVehicle.year}${
        wheelSize ? ` (has wheel size: ${wheelSize})` : ""
      }`
    );

    // Find existing vehicle in ChargeLab collection using base model
    const existingVehicle = await ChargeLab.findOne({
      "vehicle.make": fuelVehicle.make,
      "vehicle.model": baseModel, // Match with base model (no wheel size)
      "vehicle.year": fuelVehicle.year,
    });

    if (!existingVehicle) {
      console.log(
        `Skipping — ${fuelVehicle.make} ${baseModel} ${fuelVehicle.year} not found in ChargeLab`
      );
      continue;
    }

    console.log(
      `✅ Found matching vehicle: ${existingVehicle.vehicle.make} ${existingVehicle.vehicle.model} ${existingVehicle.vehicle.year}`
    );

    try {
      if (wheelSize) {
        // This data has wheel size - add as wheel variant
        const wheelVariant = {
          size: wheelSize,
          range: sanitizeRangeData({
            range_city: rawVehicle.city08,
            range_highway: rawVehicle.highway08,
            comb08: rawVehicle.comb08,
            city08: rawVehicle.city08,
            highway08: rawVehicle.highway08,
            electric_only_range: rawVehicle.range || 0,
          }),
          charging: sanitizeChargingData({
            charge120: rawVehicle.charge120 || 0,
            charge240: rawVehicle.charge240 || 0,
            charge240b: rawVehicle.charge240b || 0,
          }),
        };

        // Check if this wheel size already exists
        const existingWheelIndex = existingVehicle.wheels.findIndex(
          (w) => w.size === wheelSize
        );

        if (existingWheelIndex >= 0) {
          // Update existing wheel variant
          deepMergePreserve(
            existingVehicle.wheels[existingWheelIndex],
            wheelVariant
          );
          console.log(`Updated existing ${wheelSize} wheel variant`);
        } else {
          // Add new wheel variant
          existingVehicle.wheels.push(wheelVariant);
          console.log(`Added new ${wheelSize} wheel variant`);
        }
      } else {
        // No wheel size detected - this is fuel economy data without wheel variants

        // Check if vehicle already has a default wheel variant
        const existingDefaultIndex = existingVehicle.wheels.findIndex(
          (w) => w.size === "default"
        );

        if (existingDefaultIndex >= 0) {
          // Vehicle already has default range data (likely from NREL)
          // Only add fuel economy data to fields that don't already exist
          // DO NOT overwrite existing NREL data

          const existingDefaultVariant =
            existingVehicle.wheels[existingDefaultIndex];
          const fuelEconomyRange = sanitizeRangeData({
            range_city: rawVehicle.city08,
            range_highway: rawVehicle.highway08,
            comb08: rawVehicle.comb08,
            city08: rawVehicle.city08,
            highway08: rawVehicle.highway08,
            electric_only_range: rawVehicle.range || 0,
          });

          // Only add fuel economy data if the field doesn't already exist or is null/undefined
          for (const [key, value] of Object.entries(fuelEconomyRange)) {
            if (value !== null && value !== undefined) {
              // Only update if the existing field is null, undefined, or doesn't exist
              if (
                !existingDefaultVariant.range[key] ||
                existingDefaultVariant.range[key] === null ||
                existingDefaultVariant.range[key] === undefined
              ) {
                existingDefaultVariant.range[key] = value;
              }
            }
          }

          console.log(
            `Updated default wheel variant with fuel economy data (preserving existing NREL data)`
          );
        } else {
          // No default wheel variant exists - create one with fuel economy data
          const defaultWheelVariant = {
            size: "default",
            range: sanitizeRangeData({
              range_city: rawVehicle.city08,
              range_highway: rawVehicle.highway08,
              comb08: rawVehicle.comb08,
              city08: rawVehicle.city08,
              highway08: rawVehicle.highway08,
              electric_only_range: rawVehicle.range || 0,
            }),
            charging: sanitizeChargingData({
              charge120: rawVehicle.charge120 || 0,
              charge240: rawVehicle.charge240 || 0,
              charge240b: rawVehicle.charge240b || 0,
            }),
          };

          existingVehicle.wheels.push(defaultWheelVariant);
          console.log(`Added default wheel variant with fuel economy data`);
        }

        // Also update powertrain data from fuel economy (this can always be updated)
        const fuelData = {
          fuelType: rawVehicle.fuelType,
          drive: rawVehicle.drive,
          engine_size: rawVehicle.displ?.toString(),
          cylinders: rawVehicle.cylinders,
          category: rawVehicle.VClass,
        };

        // Merge powertrain data
        if (!existingVehicle.powertrain) {
          existingVehicle.powertrain = {};
        }
        deepMergePreserve(existingVehicle.powertrain, fuelData);
        console.log(`Updated base vehicle powertrain data`);
      }

      await existingVehicle.save();
      console.log(
        `✅ Successfully updated: ${fuelVehicle.make} ${baseModel}${
          wheelSize ? ` with ${wheelSize} wheels` : " with fuel economy data"
        }`
      );
    } catch (error) {
      console.error(
        `❌ Failed to save vehicle ${fuelVehicle.make} ${baseModel}:`,
        error.message
      );
    }
  }
};

//apis controller

export const fetchAndAddFuelVehicles = async (req, res) => {
  try {
    await fetchAndStoreVehicles();
    res.status(200).json({
      message: "Added the data completely to fuels",
    });
  } catch (e) {
    console.log(e);
    res.status.json({
      message: "Faild to fetch and store fuel economy data",
    });
  }
};

export const getChargeLabsVehicles = async (req, res) => {
  try {
    const vehicles = await ChargeLab.find({});
    res.status(200).json(vehicles);
  } catch (error) {
    console.error(`❌ Failed to retrieve Charge Labs vehicles:`, error.message);
    throw error;
  }
};

export const getVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required",
      });
    }

    // Find vehicle by MongoDB document _id
    const vehicle = await ChargeLab.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: `Vehicle with ID ${id} not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error(
      `❌ Failed to retrieve vehicle with ID ${req.params.id}:`,
      error.message
    );
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving vehicle",
      error: error.message,
    });
  }
};
