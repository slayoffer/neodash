class OktaAuthTokenManager {
  private token: any;
  private oktaConfig: any;

  constructor(oktaConfig) {
    this.oktaConfig = oktaConfig;
    this.token = null;
    console.log('OktaAuthTokenManager created.');
  }

  async initialize() {
    console.log('Initializing OktaAuthTokenManager and fetching initial token...');
    await this.refreshToken();
  }

  async getToken() {
    if (this.isTokenExpired()) {
      console.log('Token is expired, refreshing...');
      try {
        await this.refreshToken();
      } catch (e) {
        console.error('Failed to refresh auth token', e);
        // Rethrow the error so the driver knows that authentication failed.
        throw e;
      }
    }

    if (!this.token || !this.token.access_token) {
      // This should not happen if refreshToken() succeeds.
      throw new Error('No valid token available after refresh.');
    }

    console.log('Providing token to driver.');
    return { token: this.token.access_token };
  }

  isTokenExpired() {
    if (!this.token || Date.now() >= this.token.expires_at) {
      return true;
    }
    return false;
  }

  async refreshToken() {
    const storedRefreshToken = this.getRefreshToken();
    if (!storedRefreshToken) {
      console.error('No refresh token available in localStorage.');
      this.token = null;
      throw new Error('No refresh token available.');
    }

    try {
      console.log('Attempting to refresh token with Okta...');
      const response = await fetch(this.oktaConfig.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.oktaConfig.client_id,
          refresh_token: storedRefreshToken,
        }),
      });

      const newTokens = await response.json();
      console.log('Okta Refresh Response:', newTokens);

      if (!response.ok) {
        console.error('Refresh token was rejected by the server.');
        localStorage.removeItem('neodash-sso-credentials');
        this.token = null;
        throw new Error(`Refresh token is invalid. Server response: ${JSON.stringify(newTokens)}`);
      }

      this.token = {
        ...newTokens,
        expires_at: Date.now() + newTokens.expires_in * 1000,
      };

      if (newTokens.refresh_token) {
        console.log('New refresh token received, updating localStorage.');
        const existingCredentials = JSON.parse(localStorage.getItem('neodash-sso-credentials')) || {};
        const updatedCredentials = {
          ...existingCredentials,
          refreshToken: newTokens.refresh_token,
        };
        localStorage.setItem('neodash-sso-credentials', JSON.stringify(updatedCredentials));
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.token = null;
      localStorage.removeItem('neodash-sso-credentials');
      throw error;
    }
  }

  getRefreshToken() {
    const credentials = JSON.parse(localStorage.getItem('neodash-sso-credentials'));
    return credentials ? credentials.refreshToken : null;
  }
}

export default OktaAuthTokenManager;