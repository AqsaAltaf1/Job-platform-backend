import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

async function getIPv4ConnectionString() {
  const originalUrl = process.env.DATABASE_URL;
  
  if (!originalUrl) {
    console.log('❌ DATABASE_URL not found in environment variables');
    return;
  }

  console.log('🔍 Original DATABASE_URL:', originalUrl);

  try {
    // Extract hostname from the URL
    const urlMatch = originalUrl.match(/postgresql:\/\/[^@]+@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      console.log('❌ Invalid DATABASE_URL format');
      return;
    }

    const [, hostname, port, database] = urlMatch;
    console.log('🌐 Hostname:', hostname);
    console.log('🔌 Port:', port);
    console.log('🗄️  Database:', database);

    // Look up IPv4 address
    console.log('🔍 Looking up IPv4 address...');
    const result = await dnsLookup(hostname, { family: 4 });
    console.log('✅ IPv4 address found:', result.address);

    // Reconstruct the connection string with IPv4
    const ipv4Url = originalUrl.replace(hostname, result.address);
    console.log('🔗 IPv4 Connection String:');
    console.log(ipv4Url);

    console.log('\n📋 Steps to fix:');
    console.log('1. Copy the IPv4 connection string above');
    console.log('2. Go to your Render dashboard');
    console.log('3. Update the DATABASE_URL environment variable');
    console.log('4. Redeploy your service');

  } catch (error) {
    console.error('❌ Error resolving hostname:', error.message);
    
    console.log('\n🔧 Alternative solutions:');
    console.log('1. Try using the direct connection instead of pooler:');
    console.log('   Replace "pooler.supabase.com" with "db.xxx.supabase.co"');
    console.log('2. Check if your Supabase project is paused');
    console.log('3. Verify the connection string format');
  }
}

getIPv4ConnectionString();
