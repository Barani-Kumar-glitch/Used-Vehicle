import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const checkAccount = async () => {
  const apiKey = process.env.BREVO_API_KEY;
  console.log("Checking Brevo account info...");
  try {
    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "accept": "application/json",
        "api-key": apiKey
      }
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Account Data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error fetching account info:", error);
  }
};

checkAccount();
