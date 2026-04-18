// components/MindmapView.tsx
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { MindmapData } from "../app/api/mindmap";
import { ThemedText } from "./ThemedText";

interface MindmapViewProps {
  data: MindmapData;
  loading?: boolean;
  error?: string;
}

export function MindmapView({ data, loading, error }: MindmapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const cyRef = useRef<HTMLDivElement>(null);

  const buildElements = (mindmapData: MindmapData) => {
    const nodes = mindmapData.nodes || [];
    const edges = mindmapData.edges || [];
    if (nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const rootNode =
      nodes.find((node) => node.type === "root" || node.level === 0) ||
      nodes[0];
    const rootId = rootNode.id;

    const toShortLabel = (label: string) => {
      const tokens = label
        .replace(/[\n\r]+/g, " ")
        .split(/[\s,]+/)
        .filter(Boolean)
        .slice(0, 3);
      return tokens.join(" ") || label;
    };

    const rootLabelKey = toShortLabel(rootNode.label).toLowerCase();
    const hierarchyEdges = edges.filter((edge) => edge.type === "hierarchy");
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    hierarchyEdges.forEach((edge) => {
      if (!childrenMap.has(edge.source)) {
        childrenMap.set(edge.source, []);
      }
      childrenMap.get(edge.source)?.push(edge.target);
      if (!parentMap.has(edge.target)) {
        parentMap.set(edge.target, edge.source);
      }
    });

    const depthMap = new Map<string, number>();
    const queue: { id: string; depth: number }[] = [
      {
        id: rootId,
        depth: 0,
      },
    ];
    const maxDepth = 3;

    while (queue.length) {
      const current = queue.shift();
      if (!current) break;
      if (depthMap.has(current.id)) continue;
      depthMap.set(current.id, current.depth);

      if (current.depth >= maxDepth) continue;
      const children = childrenMap.get(current.id) || [];
      children.forEach((childId) => {
        queue.push({ id: childId, depth: current.depth + 1 });
      });
    }

    const keptNodes = nodes.filter((node) => depthMap.has(node.id));
    const labelMap = new Map<string, string>();
    const idMap = new Map<string, string>();
    const normalizedNodes: {
      id: string;
      label: string;
      level: number;
      type: string;
      importance?: number;
      order?: number;
    }[] = [];

    keptNodes.forEach((node) => {
      const shortLabel = toShortLabel(node.label);
      const labelKey = shortLabel.toLowerCase();
      if (node.id !== rootId && labelKey === rootLabelKey) {
        return;
      }
      if (node.id === rootId) {
        labelMap.set(labelKey, node.id);
        idMap.set(node.id, node.id);
        normalizedNodes.push({
          id: node.id,
          label: shortLabel,
          level: 0,
          type: node.type,
          importance: node.importance,
          order: node.order,
        });
        return;
      }
      const existing = labelMap.get(labelKey);
      if (existing) {
        idMap.set(node.id, existing);
        return;
      }

      labelMap.set(labelKey, node.id);
      idMap.set(node.id, node.id);
      normalizedNodes.push({
        id: node.id,
        label: shortLabel,
        level: Math.min(depthMap.get(node.id) || 1, maxDepth),
        type: node.type,
        importance: node.importance,
        order: node.order,
      });
    });

    const edgeSet = new Set<string>();
    const normalizedEdges = hierarchyEdges
      .map((edge) => {
        const source = idMap.get(edge.source);
        const target = idMap.get(edge.target);
        if (!source || !target || source === target) return null;
        const key = `${source}->${target}`;
        if (edgeSet.has(key)) return null;
        edgeSet.add(key);
        return {
          id: edge.id,
          source,
          target,
        };
      })
      .filter(Boolean) as { id: string; source: string; target: string }[];

    const branchPalette = [
      "#4ECDC4",
      "#FF6B6B",
      "#FFD93D",
      "#6C5CE7",
      "#00B894",
      "#E17055",
    ];
    const rootChildren = normalizedEdges
      .filter((edge) => edge.source === rootId)
      .map((edge) => edge.target);
    const rootChildrenSorted = [...new Set(rootChildren)].sort((a, b) => {
      const aNode = normalizedNodes.find((node) => node.id === a);
      const bNode = normalizedNodes.find((node) => node.id === b);
      const aOrder = aNode?.order ?? 999;
      const bOrder = bNode?.order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (aNode?.label || "").localeCompare(bNode?.label || "");
    });
    const branchColorMap = new Map<string, string>();
    rootChildrenSorted.forEach((childId, index) => {
      branchColorMap.set(childId, branchPalette[index % branchPalette.length]);
    });

    const parentLookup = new Map<string, string>();
    normalizedEdges.forEach((edge) => {
      if (!parentLookup.has(edge.target)) {
        parentLookup.set(edge.target, edge.source);
      }
    });

    const getBranchId = (nodeId: string) => {
      if (nodeId === rootId) return rootId;
      let current = nodeId;
      let parent = parentLookup.get(current);
      let guard = 0;
      while (parent && parent !== rootId && guard < 10) {
        current = parent;
        parent = parentLookup.get(current);
        guard += 1;
      }
      return parent === rootId ? current : nodeId;
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    const finalNodes = normalizedNodes.map((node) => {
      const importance = node.importance ?? 0.8;
      const level = node.level;
      const fontWeight =
        level === 0 || level === 1 || importance >= 0.9 ? "700" : "500";
      const labelLength = node.label.length;
      const charsPerLine = 18;
      const lines = Math.max(1, Math.ceil(labelLength / charsPerLine));
      const baseWidth = level === 0 ? 140 : level === 1 ? 120 : 100;
      const width = clamp(baseWidth + labelLength * 5, 90, 240);
      const height = clamp(30 + lines * 18, 36, 140);
      return {
        data: {
          id: node.id,
          label: node.label,
          level: node.level,
          type: node.type,
          width,
          height,
          fontWeight,
          isSection: node.level === 1,
        },
      };
    });

    const finalEdges = normalizedEdges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
      },
    }));

    return { nodes: finalNodes, edges: finalEdges };
  };

  // Generate HTML for WebView (mobile)
  const generateHTML = (mindmapData: MindmapData) => {
    const cytoscapeElements = buildElements(mindmapData);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; }
    #cy { width: 100%; height: 100vh; background-color: #ffffff; }
  </style>
</head>
<body>
  <div id="cy"></div>
  <script>
    const elements = ${JSON.stringify(cytoscapeElements)};
    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#007AFF',
            'color': '#ffffff',
            'text-outline-width': 0,
            'width': 'label',
            'height': 'label',
            'padding': '10px',
            'font-size': function(ele) {
              const level = ele.data('level');
              return level === 0 ? '14px' : level === 1 ? '13px' : '12px';
            },
            'font-weight': 'data(fontWeight)',
            'text-wrap': 'wrap',
            'text-max-width': '200px',
            'shape': 'rectangle',
            'border-width': 1.5,
            'border-color': '#007AFF'
          }
        },
        {
          selector: 'node[isSection]',
          style: {
            'border-width': 2
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#000000',
            'target-arrow-color': '#000000',
            'target-arrow-shape': 'none',
            'curve-style': 'bezier',
            'arrow-scale': 1.2
          }
        }
      ],
      layout: {
        name: 'concentric',
        fit: true,
        padding: 40,
        animate: true,
        animationDuration: 400,
        concentric: function(node) {
          const level = node.data('level') || 0;
          return 4 - level;
        },
        levelWidth: function() {
          return 1;
        },
        minNodeSpacing: 50
      },
      minZoom: 0.5,
      maxZoom: 3,
      wheelSensitivity: 0.2
    });
    cy.userPanningEnabled(true);
    cy.userZoomingEnabled(true);
    cy.boxSelectionEnabled(false);
    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      console.log('Tapped node:', node.data('label'));
    });
    setTimeout(() => { cy.fit(50); }, 100);
  </script>
</body>
</html>
    `;
  };

  // Web: render Cytoscape.js directly
  useEffect(() => {
    if (Platform.OS === "web" && cyRef.current && data) {
      console.log("🌐 Web platform detected, initializing Cytoscape...");
      console.log("📊 Mindmap data:", data);

      // Dynamically load cytoscape if not present
      if (!(window as any).cytoscape) {
        console.log("📦 Loading Cytoscape library from CDN...");
        const script = document.createElement("script");
        script.src = "https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js";
        script.async = true;
        script.onload = () => {
          console.log("✅ Cytoscape loaded successfully");
          renderCytoscape();
        };
        script.onerror = () => {
          console.error("❌ Failed to load Cytoscape library");
        };
        document.body.appendChild(script);
      } else {
        console.log("✅ Cytoscape already loaded");
        renderCytoscape();
      }
    }
    function renderCytoscape() {
      const cytoscape = (window as any).cytoscape;
      if (!cytoscape) {
        console.error("❌ Cytoscape not available");
        return;
      }
      if (!cyRef.current) {
        console.error("❌ Container ref not available");
        return;
      }

      console.log("🎨 Rendering Cytoscape graph...");
      // Clear previous
      cyRef.current.innerHTML = "";
      const elements = buildElements(data);

      console.log(
        `📍 Rendering ${elements.nodes.length} nodes and ${elements.edges.length} edges`,
      );

      try {
        const cy = cytoscape({
          container: cyRef.current,
          elements: elements,
          style: [
            {
              selector: "node",
              style: {
                label: "data(label)",
                "text-valign": "center",
                "text-halign": "center",
                "background-color": "#007AFF",
                color: "#ffffff",
                "text-outline-width": 0,
                width: "label",
                height: "label",
                padding: "10px",
                "font-size": function (ele: any) {
                  const level = ele.data("level");
                  return level === 0 ? "14px" : level === 1 ? "13px" : "12px";
                },
                "font-weight": "data(fontWeight)",
                "text-wrap": "wrap",
                "text-max-width": "200px",
                shape: "rectangle",
                "border-width": 1.5,
                "border-color": "#007AFF",
              },
            },
            {
              selector: "node[isSection]",
              style: {
                "border-width": 2,
              },
            },
            {
              selector: "edge",
              style: {
                width: 1.5,
                "line-color": "#000000",
                "target-arrow-color": "#000000",
                "target-arrow-shape": "none",
                "curve-style": "bezier",
                "arrow-scale": 1.2,
              },
            },
          ],
          layout: {
            name: "concentric",
            fit: true,
            padding: 40,
            animate: true,
            animationDuration: 400,
            concentric: function (node: any) {
              const level = node.data("level") || 0;
              return 4 - level;
            },
            levelWidth: function () {
              return 1;
            },
            minNodeSpacing: 50,
          },
          minZoom: 0.5,
          maxZoom: 3,
          wheelSensitivity: 0.2,
        });

        cy.userPanningEnabled(true);
        cy.userZoomingEnabled(true);
        cy.boxSelectionEnabled(false);
        cy.on("tap", "node", function (evt: any) {
          const node = evt.target;
          console.log("Tapped node:", node.data("label"));
        });
        setTimeout(() => {
          cy.fit(50);
          console.log("✅ Cytoscape graph rendered successfully");
        }, 100);
      } catch (error) {
        console.error("❌ Error rendering Cytoscape:", error);
      }
    }
    // eslint-disable-next-line
  }, [data]);

  // Platform: web renders Cytoscape.js directly
  if (Platform.OS === "web") {
    return (
      <View style={styles.webContainer}>
        <div
          ref={cyRef}
          style={{
            width: "100%",
            height: 400,
            borderRadius: 12,
            background: "#fff",
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <ThemedText style={styles.loadingText}>Loading mindmap...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateHTML(data) }}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#E74C3C",
    textAlign: "center",
  },
  webviewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  webContainer: {
    flex: 1,
    minHeight: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
});
