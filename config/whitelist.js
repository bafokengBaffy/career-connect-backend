// config/whitelist.js
const logger = require('../utils/logger');

class IPWhitelist {
  constructor() {
    this.whitelist = new Set([
      '127.0.0.1',
      '::1',
      ...this.parseEnvWhitelist()
    ]);
    
    logger.info('IP Whitelist initialized', { 
      count: this.whitelist.size 
    });
  }

  parseEnvWhitelist() {
    if (process.env.IP_WHITELIST) {
      return process.env.IP_WHITELIST.split(',').map(ip => ip.trim());
    }
    return [];
  }

  add(ip) {
    this.whitelist.add(ip);
    logger.info('IP added to whitelist', { ip });
  }

  remove(ip) {
    this.whitelist.delete(ip);
    logger.info('IP removed from whitelist', { ip });
  }

  contains(ip) {
    return this.whitelist.has(ip);
  }

  isWhitelisted(req) {
    const ip = req.ip || req.connection.remoteAddress;
    return this.contains(ip) || 
           req.path === '/health' || 
           req.path === '/ready' || 
           req.path === '/live';
  }

  getWhitelist() {
    return Array.from(this.whitelist);
  }
}

module.exports = new IPWhitelist();