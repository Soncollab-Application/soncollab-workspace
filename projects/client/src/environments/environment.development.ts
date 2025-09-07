const endpoint = {
  protocol: 'http',
  ip: 'localhost',
  port: '1337'
};

const baseUrl = `${endpoint.protocol}://${endpoint.ip}:${endpoint.port}`;
const api = `${baseUrl}/api`;

export const environment = {
  production: false,

  api: {
    ip: endpoint.ip,
    protocol: endpoint.protocol,
    port: endpoint.port,
    fullUrl: api,
    baseUrl: baseUrl
  },

  recaptcha: {
    siteKey: '6Le57r8rAAAAAL_-4Y6tFssiy3Drdr15s7Y5_X0B'
  },


  app: {
    name: 'Soncollab',
    version: '1.0.0',
  },


};
