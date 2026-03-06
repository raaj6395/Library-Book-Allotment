import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const scripts = ['seed_students.js', 'seed_books.js', 'seed_demo_users.js'];

for (const script of scripts) {
  const scriptPath = join(__dirname, script);
  console.log(`\n▶ Running ${script}...`);
  try {
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`✓ ${script} completed`);
  } catch (err) {
    console.error(`✗ ${script} failed`);
    process.exit(1);
  }
}

console.log('\nAll seed scripts completed.');
