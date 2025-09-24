// environment.staging.ts
export const environment = {
  production: false,
  backoffice: true,
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
    name: 'Soncollab Back-Office',
    version: '1.0.0',
    url: 'https://stg.soncollab.com'
  },
  auth: {
    tokenKey: 'soncollab_backoffice_token',
    refreshTokenKey: 'soncollab_backoffice_refresh',
    cookieDomain: '.soncollab.com',
    cookieSecure: true,
    cookieSameSite: 'Strict' as 'Strict'
  }
};
