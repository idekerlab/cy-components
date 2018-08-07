const NODE_LABEL = {
  type: "PASSTHROUGH",
  definition: "COL=COMMON,T=string"
};

class CXStyleUtil {
  constructor(network, cxStyle = DEF_VISUAL_STYLE) {
    const style = {};

    cxStyle.forEach(entry => {
      console.log("ENTRY:");
      console.log(entry);
      if (entry["properties_of"] === "nodes:default") {
        style["nodeDefaults"] = entry["properties"];
        style["nodeMappings"] = entry["mappings"];
      } else if (entry["properties_of"] === "edges:default") {
        style["edgeDefaults"] = entry["properties"];
        style["edgeMappings"] = entry["mappings"];
      }
    });

    this._style = style;
    this._network = network;

    if (style["nodeMappings"] !== undefined) {
      const colorMapping = style["nodeMappings"]["NODE_FILL_COLOR"];
      if (colorMapping !== undefined && colorMapping.type === "PASSTHROUGH") {
        this.nodeColorPt = this.parsePassthrough(colorMapping.definition);
      }
    }
  }

  getNodeColor = nodeData => {
    if (this.nodeColorPt !== undefined) {
      return this.getPassthroughValue(nodeData);
    } else {
      return this._style.nodeDefaults["NODE_FILL_COLOR"];
    }
  };

  getEdgeColor = edge => {
    return this._style.edgeDefaults["EDGE_PAINT"];
  };

  getEdgeSelectedColor = edge => {
    return this._style.edgeDefaults["EDGE_SELECTED_PAINT"];
  };

  getNodeSize = node => {};

  parsePassthrough = passthroughDefinition => {
    const example = {
      NODE_FILL_COLOR: {
        type: "PASSTHROUGH",
        definition: "COL=Vis:Fill Color,T=string"
      }
    };

    const parts = passthroughDefinition.split(",");
    if (parts.length !== 2) {
      throw new EvalError("Invalid Passthrough mapping definition");
    } else {
      const columnName = parts[0].split("=")[1];
      const dataType = parts[1].split("=")[1];

      console.log("-------------------------NEWCLN");
      const replaced = columnName.replace(/[ :]/g, "_");

      console.log(replaced);

      return {
        columnName: replaced,
        dataType: dataType
      };
    }
  };

  getPassthroughValue = data => data[this.nodeColorPt.columnName].toString();
}

const DEF_VISUAL_STYLE = [
  {
    properties_of: "nodes:default",
    properties: {
      NODE_BORDER_PAINT: "#CCCCCC",
      NODE_BORDER_STROKE: "SOLID",
      NODE_BORDER_TRANSPARENCY: "255",
      NODE_BORDER_WIDTH: "2.0",
      NODE_FILL_COLOR: "#555555",
      NODE_HEIGHT: "20.0",
      NODE_LABEL_COLOR: "#333333",
      NODE_LABEL_FONT_FACE: "HelveticaNeue,plain,12",
      NODE_LABEL_FONT_SIZE: "12",
      NODE_LABEL_TRANSPARENCY: "255",
      NODE_SELECTED_PAINT: "#FFFF00",
      NODE_SHAPE: "ELLIPSE",
      NODE_SIZE: "50.0",
      NODE_TRANSPARENCY: "255",
      NODE_WIDTH: "20.0"
    }
  },
  {
    properties_of: "edges:default",
    properties: {
      EDGE_CURVED: "true",
      EDGE_LABEL_COLOR: "#000000",
      EDGE_LABEL_FONT_FACE: "Dialog,plain,10",
      EDGE_LABEL_FONT_SIZE: "10",
      EDGE_LABEL_TRANSPARENCY: "255",
      EDGE_LINE_TYPE: "SOLID",
      EDGE_PAINT: "#CCCCCC",
      EDGE_SELECTED_PAINT: "#FF0000",
      EDGE_TRANSPARENCY: "170",
      EDGE_WIDTH: "2.0"
    }
  }
];

export default CXStyleUtil;
