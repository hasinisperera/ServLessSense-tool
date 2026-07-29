import { DATA_PATHS } from 'src/config-data';
import { SMELLS } from 'src/config-global';
import { SmellDetailLayout } from 'src/sections/smells';

export function TooManyTechView() {
  return (
    <SmellDetailLayout
      title={SMELLS.technologies}
      description="There is a large number of technologies that are not being used."
      dataPath={DATA_PATHS.smells.tooManyTechnologies}
      tableColumns={['filePath', 'message']}
    />
  );
}
