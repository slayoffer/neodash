class OktaAuthTokenManager {
  private token: any;
  private oktaConfig: any;
  private initializationPromise: Promise<void>;

  constructor(oktaConfig) {
    this.oktaConfig = oktaConfig;
    this.token = null;
    this.initializationPromise = this._initializeToken();
  }

  async _initializeToken() {
    console.log('Initializing OktaAuthTokenManager and fetching initial token...');
    await this.refreshToken();
  }

  async waitForInitialization() {
    return this.initializationPromise;
  }

  async getToken() {
    if (this.isTokenExpired()) {
      console.log('Token is expired, refreshing...');
      await this.refreshToken();
    }

    if (!this.token || !this.token.access_token) {
      console.error('No valid token available after initialization/refresh.');
      // Returning an empty object or throwing an error might be preferable
      // depending on how the driver handles it.
      return undefined;
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
      return;
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
        throw new Error(`Refresh token is invalid. Please log in again. Server response: ${JSON.stringify(newTokens)}`);
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
    }
  }

  getRefreshToken() {
    const credentials = JSON.parse(localStorage.getItem('neodash-sso-credentials'));
    return credentials ? credentials.refreshToken : null;
  }
}

export default OktaAuthTokenManager;