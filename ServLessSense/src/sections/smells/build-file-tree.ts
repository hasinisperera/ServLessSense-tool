import { joinPathSegments, splitPathSegments } from 'src/utils/split-path';

import { getSeverity } from './severity';
import type { SmellRecord, TreeNode } from './types';

export function buildFileTree(
  details: SmellRecord[],
  smellFilter?: (record: SmellRecord) => boolean
): TreeNode[] {
  const root: TreeNode[] = [];
  let nodeId = 0;

  details.forEach((detail) => {
    const pathParts = splitPathSegments(detail.filePath);
    let currentLevel = root;

    pathParts.forEach((part, index) => {
      const currentPath = joinPathSegments(pathParts.slice(0, index + 1));
      let existingNode = currentLevel.find((node) => node.path === currentPath);

      if (!existingNode) {
        const isFile = index === pathParts.length - 1;
        const smellsForNode = isFile ? [detail] : undefined;
        const filteredSmells =
          smellsForNode && smellFilter ? smellsForNode.filter(smellFilter) : smellsForNode;

        nodeId += 1;
        existingNode = {
          id: `node-${nodeId}`,
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          children: [],
          smells: filteredSmells && filteredSmells.length > 0 ? filteredSmells : isFile ? [] : undefined,
          expanded: false,
          severity:
            isFile && filteredSmells && filteredSmells.length > 0
              ? getSeverity(filteredSmells.length)
              : undefined,
        };
        currentLevel.push(existingNode);
      } else if (index === pathParts.length - 1) {
        if (!smellFilter || smellFilter(detail)) {
          existingNode.smells = existingNode.smells || [];
          existingNode.smells.push(detail);
          existingNode.severity = getSeverity(existingNode.smells.length);
        }
      }

      currentLevel = existingNode.children;
    });
  });

  return root;
}
