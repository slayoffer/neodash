import React from 'react';
import NeoPage from '../page/Page';
import NeoDashboardHeader from './header/DashboardHeader';
import NeoDashboardTitle from './header/DashboardTitle';
import NeoDashboardHeaderPageList from './header/DashboardHeaderPageList';

import { applicationGetConnection, applicationGetStandaloneSettings } from '../application/ApplicationSelectors';
import { connect } from 'react-redux';




import { version } from '../modal/AboutModal';
import NeoDashboardSidebar from './sidebar/DashboardSidebar';
import neo4j from 'neo4j-driver';


const Dashboard = ({
  pagenumber,
  connection,
  standaloneSettings,
  onConnectionUpdate,
  onDownloadDashboardAsImage,
  onAboutModalOpen,
  resetApplication,
}) => {
  const driver = React.useMemo(() => {
    if (connection.sso) {
      const auth = neo4j.auth.bearer(connection.password)
      return neo4j.driver(
        `${connection.protocol}://${connection.url}`,
        auth,
        { userAgent: `neodash/v${version}` }
        import { getPageNumber } from '../settings/SettingsSelectors';
  );
    } else {
      const auth = neo4j.auth.basic(connection.username, connection.password);
      return neo4j.driver(`${connection.protocol}://${connection.url}`, auth, {
        userAgent: `neodash/v${version}`,
      });
    }
  }, [connection]);

  React.useEffect(() => {
    return () => {
      if (driver) {
        driver.close();
      }
    };
  }, [driver]);

  // Do not render the dashboard until the driver is ready.
  if (!driver) {
    return null;
  }

  return (
    <Neo4jProvider driver={driver}>

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
