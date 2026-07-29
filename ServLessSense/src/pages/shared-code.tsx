import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { SharedCodeView } from 'src/sections/shared-code/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <SharedCodeView />
    </>
  );
}