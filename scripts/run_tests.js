const { execSync } = require('child_process');

console.log('============================================================');
console.log('OBSCURA CRYPTOGRAPHIC PROTOCOL TEST SUITE RUNNER');
console.log('============================================================');

try {
  console.log('Executing test.js...');
  execSync('node scripts/test.js', { stdio: 'inherit' });
  console.log('============================================================');
  console.log('✅ All Obscura tests passed successfully!');
  console.log('============================================================');
  process.exit(0);
} catch (error) {
  console.error('============================================================');
  console.error('❌ Obscura test suite execution failed!');
  console.error('============================================================');
  process.exit(1);
}
