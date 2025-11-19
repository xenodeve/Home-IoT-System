const axios = require('axios');

class TimeService {
  constructor({ baseUrl = 'https://worldtimeapi.org/api', timezone = 'Asia/Bangkok', googleApiKey = '', cacheTTL = 0 } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timezone = timezone;
    this.googleApiKey = googleApiKey;
    this.cacheTTL = cacheTTL; // No cache by default
    this.lastSnapshot = null;
    this.providerFailures = {}; // Track failures per provider
  }

  isCacheValid() {
    // Disable cache to always fetch fresh time
    return false;
  }

  shouldSkipProvider(name) {
    const failures = this.providerFailures[name];
    if (!failures) return false;
    
    // Skip if failed more than 3 times in last 60 seconds
    const recentFailures = failures.filter(t => Date.now() - t < 60000);
    this.providerFailures[name] = recentFailures;
    return recentFailures.length >= 3;
  }

  recordFailure(name) {
    if (!this.providerFailures[name]) {
      this.providerFailures[name] = [];
    }
    this.providerFailures[name].push(Date.now());
  }

  clearFailures(name) {
    delete this.providerFailures[name];
  }

  async fetchFromWorldTime(tz) {
    const url = `${this.baseUrl}/timezone/${encodeURIComponent(tz)}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    return {
      now: new Date(data.datetime),
      timezone: tz,
      source: 'worldtimeapi.org',
      raw: data,
      fetchedAt: new Date()
    };
  }

  async fetchFromGoogle(tz) {
    if (!this.googleApiKey) {
      throw new Error('Google API key not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // Use Bangkok coordinates as reference point
    const location = '13.7563,100.5018';
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${location}&timestamp=${timestamp}&key=${this.googleApiKey}`;

    const { data } = await axios.get(url, { timeout: 5000 });
    
    if (data.status !== 'OK') {
      throw new Error(`Google API error: ${data.status}`);
    }

    const offsetSeconds = data.rawOffset + data.dstOffset;
    const now = new Date(timestamp * 1000 + offsetSeconds * 1000);

    return {
      now,
      timezone: data.timeZoneId || tz,
      source: 'google-timezone-api',
      raw: data,
      fetchedAt: new Date()
    };
  }

  async fetchFromThaiNavy() {
    // Official Thai Standard Time from Royal Thai Navy Hydrographic Department via NTP
    const dgram = require('dgram');
    
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket('udp4');
      const host = 'time.navy.mi.th';
      const port = 123;
      
      // Create NTP packet (48 bytes)
      const msg = Buffer.alloc(48);
      msg[0] = 0x1b; // Client request
      
      const timeout = setTimeout(() => {
        client.close();
        reject(new Error('NTP request timeout'));
      }, 5000);
      
      client.send(msg, 0, msg.length, port, host, (err) => {
        if (err) {
          clearTimeout(timeout);
          client.close();
          reject(err);
        }
      });
      
      client.on('message', (response) => {
        clearTimeout(timeout);
        client.close();
        
        // NTP timestamp is at bytes 40-43
        const t = response.readUInt32BE(40);
        // Convert from NTP epoch (1900) to Unix epoch (1970)
        const unixTime = t - 2208988800;
        const now = new Date(unixTime * 1000);
        
        resolve({
          now,
          timezone: 'Asia/Bangkok',
          source: 'กรมอุทกศาสตร์ กองทัพเรือ',
          raw: { timestamp: t, unixTime },
          fetchedAt: new Date()
        });
      });
      
      client.on('error', (err) => {
        clearTimeout(timeout);
        client.close();
        reject(err);
      });
    });
  }

  async fetchFromTimeApi() {
    // Fallback to time.api alternative
    const url = 'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok';
    const { data } = await axios.get(url, { timeout: 8000 });
    return {
      now: new Date(data.dateTime),
      timezone: data.timeZone,
      source: 'timeapi.io',
      raw: data,
      fetchedAt: new Date()
    };
  }

  async fetchFromNTPPool() {
    // Use time.is as simple HTTP endpoint
    const url = 'https://time.is/Bangkok';
    const { data, headers } = await axios.get(url, { 
      timeout: 8000,
      validateStatus: () => true 
    });
    // Use Date header from response
    const serverDate = headers.date ? new Date(headers.date) : new Date();
    return {
      now: serverDate,
      timezone: this.timezone,
      source: 'http-headers',
      raw: { date: headers.date },
      fetchedAt: new Date()
    };
  }

  async fetchAuthoritativeTime(customTimezone) {
    // Always fetch fresh time - no cache
    const tz = customTimezone || this.timezone;
    const providers = [
      { name: 'thai-navy', fn: () => this.fetchFromThaiNavy() },
      // { name: 'worldtime', fn: () => this.fetchFromWorldTime(tz) },
      { name: 'http-date', fn: () => this.fetchFromNTPPool() },
      { name: 'google', fn: () => this.fetchFromGoogle(tz) },
      { name: 'timeapi', fn: () => this.fetchFromTimeApi() }
    ];

    // Try Google first if API key is available
    if (this.googleApiKey) {
      providers.sort((a, b) => (a.name === 'google' ? -1 : b.name === 'google' ? 1 : 0));
    }

    for (const provider of providers) {
      // Skip providers that have failed repeatedly
      if (this.shouldSkipProvider(provider.name)) {
        continue;
      }

      try {
        const snapshot = await provider.fn();
        this.lastSnapshot = snapshot;
        this.clearFailures(provider.name); // Success, clear failure history
        console.log(`✅ TimeService using: ${snapshot.source}`);
        return snapshot;
      } catch (error) {
        this.recordFailure(provider.name);
        console.warn(`⚠️  TimeService ${provider.name} failed:`, error.message);
      }
    }

    // All providers failed, use system clock as last resort
    console.error('❌ All time providers failed, using system clock');
    const fallback = {
      now: new Date(),
      timezone: tz,
      source: 'system-clock',
      raw: null,
      fetchedAt: new Date()
    };
    this.lastSnapshot = fallback;
    return fallback;
  }

  getLastSnapshot() {
    return this.lastSnapshot;
  }
}

module.exports = TimeService;
