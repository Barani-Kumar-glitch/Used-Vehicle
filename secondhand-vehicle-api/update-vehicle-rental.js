// Script to update existing vehicles to listing_mode='both' and add per-vehicle rental rates
import { connectDB } from './src/config/db.js';
import { Vehicle } from './src/models/index.js';

const updateVehicles = async () => {
  await connectDB();

  // Define vehicle-specific rental rates
  const vehicleRates = [
    {
      make: 'Toyota',
      model: 'Camry',
      // Compact Sedan - more affordable rates
      rate_per_hour: 350,
      rate_per_day: 2800,
      listing_mode: 'both',
    },
    {
      make: 'Toyota',
      model: 'Fortuner',
      // Premium SUV - higher rates
      rate_per_hour: 700,
      rate_per_day: 5500,
      listing_mode: 'both',
    },
  ];

  for (const v of vehicleRates) {
    const [count] = await Vehicle.update(
      {
        listing_mode: v.listing_mode,
        rate_per_hour: v.rate_per_hour,
        rate_per_day: v.rate_per_day,
      },
      {
        where: { make: v.make, model: v.model },
      }
    );
    console.log(`Updated ${count} vehicle(s): ${v.make} ${v.model} → ₹${v.rate_per_hour}/hr | ₹${v.rate_per_day}/day`);
  }

  process.exit(0);
};

updateVehicles().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
