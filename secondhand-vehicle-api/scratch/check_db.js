import { RentalBooking, RequestLog, Customer } from '../src/models/index.js';
import { sequelize } from '../src/config/db.js';

async function main() {
  try {
    console.log("Fetching bookings...");
    const bookings = await RentalBooking.findAll({
      include: [Customer]
    });
    console.log("Rental Bookings in DB:");
    bookings.forEach(b => {
      console.log(`- ID: ${b.rental_id}, Cust: ${b.Customer?.name} (${b.Customer?.phone}), VehicleID: ${b.vehicle_id}, Pickup: ${b.pickup_time}, ExpectedReturn: ${b.expected_return_time}, Price: ${b.price}`);
    });

    console.log("\nFetching request logs...");
    const requests = await RequestLog.findAll({
      include: [Customer]
    });
    console.log("Request Logs in DB:");
    requests.forEach(r => {
      console.log(`- ID: ${r.request_id}, Cust: ${r.Customer?.name}, Type: ${r.request_type}, RefCode: ${r.referral_code}, Status: ${r.status}, Details: ${r.details}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error("Error running query:", error);
    process.exit(1);
  }
}

main();
