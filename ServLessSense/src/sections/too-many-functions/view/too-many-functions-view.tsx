import { DATA_PATHS } from 'src/config-data';
import { SMELLS } from 'src/config-global';
import { SmellDetailLayout } from 'src/sections/smells';

export function TooManyFunctionsView() {
  return (
    <SmellDetailLayout
      title={SMELLS.functions}
      description="There are functions that have duplicate code snippets that are performing the same task."
      dataPath={DATA_PATHS.smells.tooManyFunctions}
      tableColumns={['filePath', 'message', 'actions']}
      enableRefactor
      refactorType="too-many-functions"
    />
  );
}
