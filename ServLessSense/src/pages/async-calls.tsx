import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AsyncCallsView } from 'src/sections/async-calls/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {CONFIG.appName}</title>
      </Helmet>

      <AsyncCallsView />
    </>
  );
}
