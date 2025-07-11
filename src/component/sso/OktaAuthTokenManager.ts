
import neo4j from 'neo4j-driver';

class OktaAuthTokenManager {
  private token: any;
  private oktaConfig: any;

  constructor(oktaConfig) {
    this.oktaConfig = oktaConfig;
    this.token = null;
  }

  async getToken() {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
    return this.token;
  }

  isTokenExpired() {
    if (!this.token || Date.now() >= this.token.expires_at) {
      return true;
    }
    return false;
  }

  async refreshToken() {
    const response = await fetch(this.oktaConfig.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.oktaConfig.client_id,
        refresh_token: this.getRefreshToken(),
      }),
    });

    const newTokens = await response.json();

    this.token = {
      ...newTokens,
      expires_at: Date.now() + newTokens.expires_in * 1000,
    };
  }

  getRefreshToken() {
    const credentials = JSON.parse(localStorage.getItem('neodash-sso-credentials'));
    return credentials ? credentials.refreshToken : null;
  }

  onTokenExpired() {
    // Cleanup logic if needed
  }
}

export default OktaAuthTokenManager;
