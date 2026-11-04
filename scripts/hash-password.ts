import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

async function main(): Promise<void> {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: npm run hash-password -- "your-password-here"');
    process.exitCode = 1;
    return;
  }
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  console.log(hash);
}

main();
