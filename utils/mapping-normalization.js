export const fieldMap = {
  vehicle: {
    id: ["id", "vehicle_id"],
    make: ["make", "manufacturer", "brand", "manufacturer_name"],
    model: ["model", "model_name"],
    year: ["year", "model_year", "model year"],
    trim: ["trim", "version", "sub_model"],
  },
  range: {
    electric_only_range: ["electric_only_range", "ev_range"],
    range: ["range", "total_range"],
    range_city: ["range_city", "city_range"],
    range_highway: ["range_highway", "highway_range"],
    alternative_fuel_economy_city: [
      "alternative_fuel_economy_city",
      "alt_city_mpg",
    ],
    city08: ["city08"],
    alternative_fuel_economy_highway: [
      "alternative_fuel_economy_highway",
      "alt_hwy_mpg",
    ],
    highway08: ["highway08"],
    alternative_fuel_economy_combined: [
      "alternative_fuel_economy_combined",
      "alt_comb_mpg",
    ],
    comb08: ["comb08"],
  },
  charging: {
    ac_connector: ["ac_connector", "ac_type"],
    charging_rate_level_2: ["charging_rate_level_2", "ac_kw"],
    charging_speed_level_2: ["charging_speed_level_2", "ac_speed"],
    dc_connector: ["dc_connector", "dc_type"],
    charging_rate_dc_fast: [
      "charging_rate_dc_fast",
      "charging_rate_DC_fast",
      "dc_kw",
    ],
    charging_speed_dc_fast: [
      "charging_speed_dc_fast",
      "charging_speed_DC_fast",
      "dc_speed",
    ],
  },
  powertrain: {
    engine_type: ["engine_type", "engine"],
    fuelType: ["fuelType", "fuel_type"],
    engine_size: ["engine_size", "engine_capacity"],
    evMotor: ["evMotor", "electric_motor"],
    driveTrain: ["driveTrain", "drivetrain"],
    drive: ["drive", "drive_type"],
    category: ["category_name", "vehicle_class"],
  },
  battery: {
    battery_voltage: ["battery_voltage", "voltage"],
    battery_capacity_amp_hours: ["battery_capacity_amp_hours", "amp_hours"],
    battery_capacity_kwh: ["battery_capacity_kwh", "kwh_capacity"],
    battery_type: ["battery_type", "battery_kind"],
  },
  picture: ["picture", "image_url", "photo"],
};

export const normalizeVehicleData = (raw, fieldMap) => {
  const normalized = {};

  for (const [section, fields] of Object.entries(fieldMap)) {
    if (typeof fields === "object" && !Array.isArray(fields)) {
      normalized[section] = {};
      for (const [targetField, aliases] of Object.entries(fields)) {
        normalized[section][targetField] = aliases.reduce((val, key) => {
          return raw[key] !== undefined && raw[key] !== null ? raw[key] : val;
        }, undefined);
      }
    } else {
      // Handle top-level fields like "picture"
      normalized[section] = fields.reduce((val, key) => {
        return raw[key] !== undefined && raw[key] !== null ? raw[key] : val;
      }, undefined);
    }
  }

  return normalized;
};
