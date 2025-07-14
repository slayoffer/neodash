
import { AuthTokenManager, AuthToken } from 'neo4j-driver';

class OktaAuthTokenManager implements AuthTokenManager {
  private token: AuthToken | null = null;
  private refreshToken: string | null = null;
  private expires: number | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(initialToken: AuthToken) {
    this.processNewToken(initialToken);
  }

  private processNewToken(newToken: AuthToken) {
    this.token = newToken;
    this.refreshToken = newToken.refresh_token || this.refreshToken;
    // @ts-ignore
    this.expires = newToken.expires_in ? Date.now() + newToken.expires_in * 1000 : null;
  }

  public async getToken(): Promise<AuthToken | null> {
    if (this.isTokenExpired()) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refresh().finally(() => {
          this.refreshPromise = null;
        });
      }
      await this.refreshPromise;
    }
    return this.token;
  }

  private isTokenExpired(): boolean {
    if (!this.expires) {
      return false;
    }
    // Add a 60-second buffer to be safe
    return Date.now() > this.expires - 60000;
  }

  private async refresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available.');
    }

    const tokenUrl = localStorage.getItem('tokenUrl');
    if (!tokenUrl) {
      throw new Error('No token URL available.');
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${this.refreshToken}`,
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const newToken = await response.json();
    this.processNewToken(newToken);
  }
}

export default OktaAuthTokenManager;
