import React from 'react';
import NeoPage from '../page/Page';
import NeoDashboardHeader from './header/DashboardHeader';
import NeoDashboardTitle from './header/DashboardTitle';
import NeoDashboardHeaderPageList from './header/DashboardHeaderPageList';
import { Neo4jProvider } from 'use-neo4j';
import { applicationGetConnection, applicationGetStandaloneSettings } from '../application/ApplicationSelectors';
import { connect } from 'react-redux';
import NeoDashboardConnectionUpdateHandler from '../component/misc/DashboardConnectionUpdateHandler';
import { forceRefreshPage } from '../page/PageActions';
import { getPageNumber } from '../settings/SettingsSelectors';
import { createNotificationThunk } from '../page/PageThunks';
import { version } from '../modal/AboutModal';
import NeoDashboardSidebar from './sidebar/DashboardSidebar';
import neo4j from 'neo4j-driver';
import OktaAuthTokenManager from '../component/sso/OktaAuthTokenManager';

const Dashboard = ({
  pagenumber,
  connection,
  standaloneSettings,
  onConnectionUpdate,
  onDownloadDashboardAsImage,
  onAboutModalOpen,
  resetApplication,
}) => {
  const [driver, setDriver] = React.useState(undefined);

  // This useEffect hook is the core of the fix. It runs whenever the connection details change.
  React.useEffect(() => {
    console.log('Dashboard.tsx: Connection object received:', connection);
    if (driver) {
      driver.close();
    }

    let newDriver;
    if (connection.sso) {
      const oktaConfig = {
        token_endpoint: connection.sso.token_endpoint,
        client_id: connection.sso.client_id,
      };
      const authTokenManager = new OktaAuthTokenManager(oktaConfig);
      const auth = neo4j.auth.bearer(authTokenManager)
      console.log('Auth object for SSO driver:', auth);
      newDriver = neo4j.driver(
        `${connection.protocol}://${connection.url}`,
        auth,
        { userAgent: `neodash/v${version}` }
      );
    } else {
      const auth = neo4j.auth.basic(connection.username, connection.password);
      newDriver = neo4j.driver(`${connection.protocol}://${connection.url}`, auth, {
        userAgent: `neodash/v${version}`,
      });
    }
    setDriver(newDriver);

    return () => {
      if (driver) {
        driver.close();
      }
    };
  }, [connection]);

  // Do not render the dashboard until the driver is ready.
  if (!driver) {
    return null;
  }

  const content = (
    <Neo4jProvider driver={driver}>
      <NeoDashboardConnectionUpdateHandler
        pagenumber={pagenumber}
        connection={connection}
        onConnectionUpdate={onConnectionUpdate}
      />

      {/* Navigation Bar */}
      <div
        className='n-w-screen n-flex n-flex-row n-items-center n-bg-neutral-bg-weak n-border-b'
        style={{ borderColor: 'lightgrey' }}
      >
        <NeoDashboardHeader
          connection={connection}
          onDownloadImage={onDownloadDashboardAsImage}
          onAboutModalOpen={onAboutModalOpen}
          resetApplication={resetApplication}
        ></NeoDashboardHeader>
      </div>
      {/* Main Page */}
      <div
        style={{
          display: 'flex',
          height: 'calc(40vh - 32px)',
          minHeight: window.innerHeight - 62,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {!standaloneSettings.standalone || (standaloneSettings.standalone && standaloneSettings.standaloneAllowLoad) ? (
          <NeoDashboardSidebar />
        ) : (
          <></>
        )}
        <div className='n-w-full n-h-full n-flex n-flex-col n-items-center n-justify-center n-rounded-md'>
          <div className='n-w-full n-h-full n-overflow-y-scroll n-flex n-flex-row'>
            {/* Main Content */}
            <main className='n-flex-1 n-relative n-z-0 n-scroll-smooth n-w-full'>
              <div className='n-absolute n-inset-0 page-spacing'>
                <div className='page-spacing-overflow'>
                  {/* The main content of the page */}

                  <div>
                    {standaloneSettings.standalonePassword &&
                    standaloneSettings.standalonePasswordWarningHidden !== true ? (
                      <div style={{ textAlign: 'center', color: 'red', paddingTop: 60, marginBottom: -50 }}>
                        Warning: NeoDash is running with a plaintext password in config.json.
                      </div>
                    ) : (
                      <></>
                    )}
                    <NeoDashboardTitle />
                    <NeoDashboardHeaderPageList />
                    <NeoPage></NeoPage>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </Neo4jProvider>
  );
  return content;
};

const mapStateToProps = (state) => ({
  connection: applicationGetConnection(state),
  pagenumber: getPageNumber(state),
  standaloneSettings: applicationGetStandaloneSettings(state),
});

const mapDispatchToProps = (dispatch) => ({
  onConnectionUpdate: (pagenumber) => {
    dispatch(
      createNotificationThunk(
        'Connection Updated',
        'You have updated your Neo4j connection, your reports have been reloaded.'
      )
    );
    dispatch(forceRefreshPage(pagenumber));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
