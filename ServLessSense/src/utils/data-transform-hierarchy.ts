interface SmellData {
  filePath: string;
  line: number;
  code?: string;
  message?: string;
  severity?: number;
}

interface TreeNode {
  name: string;
  size?: number;
  children: TreeNode[];
}

const buildHierarchy = (smellData: SmellData[]): TreeNode => {
  const root: TreeNode = { name: "Project Root", children: [] };

  smellData.forEach((item) => {
    const parts = item.filePath.split("\\"); // Assuming Windows path separator
    let current = root;

    parts.forEach((part, index) => {
      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, children: [] };
        if (index === parts.length - 1) {
          child.size = item.severity || 1; // You can use severity, count of issues, etc.
        }
        current.children.push(child);
      }
      current = child;
    });
  });

  return root;
};

export default buildHierarchy;
