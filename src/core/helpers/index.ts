import * as bcrypt from 'bcrypt';

export async function hashPassword(str: string): Promise<string> {
  const hash = await bcrypt.hash(str, 10);
  return hash;
}

export function generateRandomOTP() {
  return (
    Math.floor(Math.random() * (9 * Math.pow(10, 6 - 1))) + Math.pow(10, 6 - 1)
  );
}

export function getExpiryDate() {
  // Create a Date object using the input date string
  const todayDate = new Date();

  // Add 24 hours (1 day) to the date
  todayDate.setHours(todayDate.getHours() + 24);

  // Format the date in ISO 8601 format
  return todayDate;
}
