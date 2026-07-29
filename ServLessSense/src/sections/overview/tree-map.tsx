import React from "react";
import Tree from "react-d3-tree";

interface TreeMapProps {
  data: any;
}

const TreeMap: React.FC<TreeMapProps> = ({ data }) => {
  const renderCustomNode = ({ nodeDatum }: any) => (
    <g>
      <circle r={10} fill="blue" />
      <text x={20} dy={-10}>
        {nodeDatum.name}
      </text>
      {nodeDatum.attributes?.smells && (
        <text x={20} dy={10}>
          Smells: {Object.keys(nodeDatum.attributes.smells).length}
        </text>
      )}
    </g>
  );

  // Set desired width and height for the tree map
  const treeWidth = 1500;
  const treeHeight = 800;

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Tree
        data={data}
        renderCustomNodeElement={renderCustomNode}
        orientation="vertical" // Horizontal layout
        // width={treeWidth}         // Set width for the tree
        // height={treeHeight}       // Set height for the tree
        nodeSize={{ x: 200, y: 100 }} // Adjust size of each node (optional)
      />
    </div>
  );
};

export default TreeMap;
