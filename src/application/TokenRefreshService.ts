
import { Store } from 'redux';
import { setConnectionProperties } from './ApplicationActions';

class TokenRefreshService {
  private store: Store;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(store: Store) {
    this.store = store;
  }

  public start() {
    this.scheduleRefresh();
  }

  public stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private scheduleRefresh() {
    const state = this.store.getState();
    const { sso } = state.application.connection;

    if (!sso || !sso.refresh_token || !sso.expires_in) {
      return;
    }

    // Refresh the token 60 seconds before it expires
    const refreshDelay = (sso.expires_in - 60) * 1000;

    this.timeoutId = setTimeout(() => {
      this.refreshToken();
    }, refreshDelay);
  }

  private async refreshToken() {
    const state = this.store.getState();
    const { sso } = state.application.connection;

    if (!sso || !sso.refresh_token) {
      return;
    }

    const tokenUrl = localStorage.getItem('tokenUrl');
    if (!tokenUrl) {
      console.error('No token URL available for refresh.');
      return;
    }

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${sso.refresh_token}`,
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const newToken = await response.json();

      const { protocol, url, port, database, username } = state.application.connection;

      this.store.dispatch(
        setConnectionProperties(protocol, url, port, database, username, newToken.access_token, {
          ...sso,
          ...newToken,
        })
      );

      this.scheduleRefresh();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }
}

export default TokenRefreshService;
