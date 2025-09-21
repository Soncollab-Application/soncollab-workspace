// environment.staging.ts
export const environment = {
  production: false,
  api: {
    ip: 'stg-api.soncollab.com',
    protocol: 'https',
    fullUrl: 'https://stg-api.soncollab.com/api',
    baseUrl: 'https://stg-api.soncollab.com'
  },

  recaptcha: {
    siteKey: '6Le57r8rAAAAAL_-4Y6tFssiy3Drdr15s7Y5_X0B'
  },


  app: {
    name: 'Soncollab',
    version: '1.0.0',
  },
};
