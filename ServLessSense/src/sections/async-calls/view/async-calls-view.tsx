import { DATA_PATHS } from 'src/config-data';
import { SMELLS } from 'src/config-global';
import { SmellDetailLayout } from 'src/sections/smells';

export function AsyncCallsView() {
  return (
    <SmellDetailLayout
      title={SMELLS.asyncCalls}
      description="There is a high usage of synchronous function calls instead of asynchronous functions."
      dataPath={DATA_PATHS.smells.asyncCalls}
      tableColumns={['filePath', 'type', 'code', 'actions']}
      recordFilter={(record) => record.type === 'sync'}
      treeSmellFilter={(record) => record.type === 'sync'}
      enableRefactor
      refactorType="async"
    />
  );
}

export default AsyncCallsView;
