import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { TooManyFunctionsView } from 'src/sections/too-many-functions/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <TooManyFunctionsView />
    </>
  );
}