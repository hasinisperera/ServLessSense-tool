import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { TooManyTechView } from 'src/sections/too-many-tech/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <TooManyTechView />
    </>
  );
}