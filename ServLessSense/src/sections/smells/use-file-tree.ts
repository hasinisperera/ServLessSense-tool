import { useMemo, useState } from 'react';

import { buildFileTree } from './build-file-tree';
import { getSeverity } from './severity';
import type { Severity, SmellRecord, TreeNode } from './types';

type UseFileTreeOptions = {
  records: SmellRecord[];
  recordFilter?: (record: SmellRecord) => boolean;
  treeSmellFilter?: (record: SmellRecord) => boolean;
};

export function useFileTree({ records, recordFilter, treeSmellFilter }: UseFileTreeOptions) {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const filteredRecords = useMemo(() => {
    if (!recordFilter) return records;
    return records.filter(recordFilter);
  }, [records, recordFilter]);

  const fileTree = useMemo(
    () => buildFileTree(filteredRecords, treeSmellFilter),
    [filteredRecords, treeSmellFilter]
  );

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const filterTreeNode = (node: TreeNode): TreeNode | null => {
    const nodeSmells =
      node.smells && treeSmellFilter ? node.smells.filter(treeSmellFilter) : node.smells;

    const nodeWithSmells = {
      ...node,
      smells: nodeSmells,
      severity:
        nodeSmells && nodeSmells.length > 0 ? getSeverity(nodeSmells.length) : node.severity,
    };

    if (node.type === 'file' && (!nodeSmells || nodeSmells.length === 0)) {
      return null;
    }

    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity =
      severityFilter === 'all' ||
      (nodeSmells && nodeSmells.length > 0 && nodeWithSmells.severity === severityFilter);

    if (matchesSearch && (matchesSeverity || node.type === 'directory')) {
      return { ...nodeWithSmells, expanded: true };
    }

    if (node.children.length > 0) {
      const filteredChildren = node.children
        .map((child) => filterTreeNode(child))
        .filter(Boolean) as TreeNode[];

      if (filteredChildren.length > 0) {
        return { ...nodeWithSmells, children: filteredChildren, expanded: true };
      }
    }

    return null;
  };

  const filteredTree = useMemo(
    () => fileTree.map((node) => filterTreeNode(node)).filter(Boolean) as TreeNode[],
  // eslint-disable-next-line react-hooks/exhaustive-deps
    [fileTree, searchTerm, severityFilter, treeSmellFilter]
  );

  return {
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    severityFilter,
    setSeverityFilter,
    expandedNodes,
    toggleNode,
    filteredRecords,
    filteredTree,
  };
}
