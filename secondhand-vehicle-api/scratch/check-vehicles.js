import { connectDB } from '../src/config/db.js';
import { Vehicle, VehiclePrice, RequestLog } from '../src/models/index.js';

const check = async () => {
  await connectDB();

  console.log('--- ALL VEHICLES ---');
  const vehicles = await Vehicle.findAll({
    include: [{ model: VehiclePrice, as: 'prices', where: { effective_to: null }, required: false }]
  });
  for (const v of vehicles) {
    console.log(`ID: ${v.vehicle_id}, Make: ${v.make}, Model: ${v.model}, Status: ${v.status}, Mode: ${v.listing_mode}, Prices Length: ${v.prices ? v.prices.length : 0}`);
    if (v.prices && v.prices.length > 0) {
      console.log(`  Price: ${v.prices[0].price}, Daily Rate: ${v.prices[0].daily_rate}`);
    }
  }

  console.log('--- PENDING REQUEST LOGS ---');
  const pendingRequests = await RequestLog.findAll({
    where: {
      status: 'pending',
      request_type: ['buy', 'rent']
    }
  });
  for (const r of pendingRequests) {
    console.log(`Request ID: ${r.request_id}, Vehicle ID: ${r.vehicle_id}, Type: ${r.request_type}, Status: ${r.status}`);
  }

  process.exit(0);
};

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
