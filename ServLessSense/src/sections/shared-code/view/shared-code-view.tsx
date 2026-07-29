import { DATA_PATHS } from 'src/config-data';
import { SMELLS } from 'src/config-global';
import { SmellDetailLayout } from 'src/sections/smells';

export function SharedCodeView() {
  return (
    <SmellDetailLayout
      title={SMELLS.shared}
      description="There is code shared across multiple functions making a strong coupling between microservices and tying new releases together."
      dataPath={DATA_PATHS.smells.sharedCode}
      tableColumns={['filePath', 'message']}
    />
  );
}
