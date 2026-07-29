import { DATA_PATHS } from 'src/config-data';
import { SMELLS } from 'src/config-global';
import { SmellDetailLayout } from 'src/sections/smells';

export function TooManyLibrariesView() {
  return (
    <SmellDetailLayout
      title={SMELLS.libraries}
      description="There are libraries imported but are not being used or only a small part of a large library is being used."
      dataPath={DATA_PATHS.smells.tooManyLibraries}
      tableColumns={['filePath', 'message']}
    />
  );
}
