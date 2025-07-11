
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
    const storedRefreshToken = this.getRefreshToken();
    if (!storedRefreshToken) {
      // No refresh token available, we can't do anything.
      this.token = null;
      return;
    }

    try {
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

      if (!response.ok) {
        // The refresh token was rejected (e.g., expired, revoked).
        // Clear the invalid token from storage to prevent getting stuck.
        localStorage.removeItem('neodash-sso-credentials');
        this.token = null;
        throw new Error('Refresh token is invalid. Please log in again.');
      }

      // Update the access token for the current session.
      this.token = {
        ...newTokens,
        expires_at: Date.now() + newTokens.expires_in * 1000,
      };

      // **Handle Refresh Token Rotation**
      // Check if a new refresh token was issued and update storage if so.
      if (newTokens.refreshToken) {
        const existingCredentials = JSON.parse(localStorage.getItem('neodash-sso-credentials')) || {};
        const updatedCredentials = {
          ...existingCredentials,
          refreshToken: newTokens.refreshToken,
        };
        localStorage.setItem('neodash-sso-credentials', JSON.stringify(updatedCredentials));
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Ensure we don't try to use a bad token again.
      this.token = null;
      localStorage.removeItem('neodash-sso-credentials');
    }
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
