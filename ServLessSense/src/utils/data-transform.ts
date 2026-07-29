type SmellDataItem = {
  type: string;
  filePath: string;
  line: number;
  code: string;
};

type TreeNode = {
  name: string;
  children?: TreeNode[];
  attributes?: {
    smells: number;
  };
};

export const buildHierarchy = (smellData: SmellDataItem[]): TreeNode => {
  const root: TreeNode = { name: "Project Root", children: [] };

  const smellCountByFile: Record<string, number> = {};

  // Count smells per file
  smellData.forEach((item) => {
    if (!smellCountByFile[item.filePath]) {
      smellCountByFile[item.filePath] = 0;
    }
    smellCountByFile[item.filePath] += 1;
  });

  // Build hierarchy
  Object.entries(smellCountByFile).forEach(([filePath, smellsCount]) => {
    const parts = filePath.split("\\"); // Use "\\" for Windows-style paths
    let current = root;

    parts.forEach((part, index) => {
      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = { name: part, children: [] };
        if (index === parts.length - 1) {
          child.attributes = { smells: smellsCount };
        }
        current.children.push(child);
      }

      current = child;
    });
  });

  return root;
};
