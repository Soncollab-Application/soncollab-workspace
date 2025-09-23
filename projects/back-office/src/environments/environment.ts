export const environment = {
  production: true,
  backoffice: true,

  api: {
    ip: 'api.soncollab.com',
    protocol: 'https',
    fullUrl: 'https://api.soncollab.com/api',
    baseUrl: 'https://api.soncollab.com'
  },

  recaptcha: {
    siteKey: '6Le57r8rAAAAAL_-4Y6tFssiy3Drdr15s7Y5_X0B'
  },

  app: {
    name: 'Soncollab Back-Office',
    version: '1.0.0',
  },
  auth: {
    tokenKey: 'soncollab_backoffice_token',
    refreshTokenKey: 'soncollab_backoffice_refresh',
    cookieDomain: '.soncollab.com',
    cookieSecure: true,
    cookieSameSite: 'Strict' as 'Strict'
  }
};
