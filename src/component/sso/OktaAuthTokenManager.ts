import { AuthToken, AuthTokenManager, BearerAuthIdentity } from 'neo4j-driver';

class OktaAuthTokenManager implements AuthTokenManager {
  private readonly token_endpoint: string;
  private readonly client_id: string;

  constructor(config: { token_endpoint: string; client_id: string }) {
    this.token_endpoint = config.token_endpoint;
    this.client_id = config.client_id;
  }

  public async getToken(): Promise<AuthToken | null> {
    const token = this.getOktaToken();
    if (token) {
      return Promise.resolve(token);
    }
    return Promise.resolve(null);
  }

  public onTokenExpired(token: AuthToken): Promise<AuthToken | null> {
    return this.refreshToken(token);
  }

  private getOktaToken(): AuthToken | null {
    const storedValue = localStorage.getItem('neodash-sso-credentials');
    if (storedValue) {
      const token = JSON.parse(storedValue);
      return token;
    }
    return null;
  }

  private async refreshToken(expiredToken: AuthToken): Promise<AuthToken | null> {
    try {
      const response = await fetch(this.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${expiredToken.refresh_token}&client_id=${this.client_id}`,
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const newToken = await response.json();
      localStorage.setItem('neodash-sso-credentials', JSON.stringify(newToken));
      return newToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }
}

export default OktaAuthTokenManager;
