import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { TooManyLibrariesView } from 'src/sections/too-many-libraries/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <TooManyLibrariesView />
    </>
  );
}