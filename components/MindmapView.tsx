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

  // Generate HTML for WebView (mobile)
  const generateHTML = (mindmapData: MindmapData) => {
    const cytoscapeElements = {
      nodes: mindmapData.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          level: node.level,
          type: node.type,
        },
      })),
      edges: mindmapData.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
        },
      })),
    };
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
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
            'background-color': function(ele) {
              const type = ele.data('type');
              if (type === 'root') return '#4A90E2';
              if (type === 'topic') return '#7ED321';
              return '#F5A623';
            },
            'color': '#fff',
            'text-outline-color': function(ele) {
              const type = ele.data('type');
              if (type === 'root') return '#4A90E2';
              if (type === 'topic') return '#7ED321';
              return '#F5A623';
            },
            'text-outline-width': 2,
            'width': function(ele) {
              const level = ele.data('level');
              return level === 0 ? 80 : level === 1 ? 60 : 50;
            },
            'height': function(ele) {
              const level = ele.data('level');
              return level === 0 ? 80 : level === 1 ? 60 : 50;
            },
            'font-size': function(ele) {
              const level = ele.data('level');
              return level === 0 ? '16px' : level === 1 ? '14px' : '12px';
            },
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            'shape': 'ellipse',
            'border-width': 2,
            'border-color': '#333'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.5
          }
        }
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.5,
        padding: 50,
        animate: true,
        animationDuration: 500,
        fit: true,
        roots: elements.nodes
          .filter(n => n.data.level === 0)
          .map(n => '#' + n.data.id)
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
      // Dynamically load cytoscape if not present
      if (!(window as any).cytoscape) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js";
        script.async = true;
        script.onload = () => renderCytoscape();
        document.body.appendChild(script);
      } else {
        renderCytoscape();
      }
    }
    function renderCytoscape() {
      const cytoscape = (window as any).cytoscape;
      if (!cytoscape || !cyRef.current) return;
      // Clear previous
      cyRef.current.innerHTML = "";
      const elements = {
        nodes: data.nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            level: node.level,
            type: node.type,
          },
        })),
        edges: data.edges.map((edge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
          },
        })),
      };
      const cy = cytoscape({
        container: cyRef.current,
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'background-color': function(ele) {
                const type = ele.data('type');
                if (type === 'root') return '#4A90E2';
                if (type === 'topic') return '#7ED321';
                return '#F5A623';
              },
              'color': '#fff',
              'text-outline-color': function(ele) {
                const type = ele.data('type');
                if (type === 'root') return '#4A90E2';
                if (type === 'topic') return '#7ED321';
                return '#F5A623';
              },
              'text-outline-width': 2,
              'width': function(ele) {
                const level = ele.data('level');
                return level === 0 ? 80 : level === 1 ? 60 : 50;
              },
              'height': function(ele) {
                const level = ele.data('level');
                return level === 0 ? 80 : level === 1 ? 60 : 50;
              },
              'font-size': function(ele) {
                const level = ele.data('level');
                return level === 0 ? '16px' : level === 1 ? '14px' : '12px';
              },
              'text-wrap': 'wrap',
              'text-max-width': '120px',
              'shape': 'ellipse',
              'border-width': 2,
              'border-color': '#333'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#999',
              'target-arrow-color': '#999',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 1.5
            }
          }
        ],
        layout: {
          name: 'breadthfirst',
          directed: true,
          spacingFactor: 1.5,
          padding: 50,
          animate: true,
          animationDuration: 500,
          fit: true,
          roots: elements.nodes
            .filter(n => n.data.level === 0)
            .map(n => '#' + n.data.id)
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
    }
    // eslint-disable-next-line
  }, [data]);

  // Platform: web renders Cytoscape.js directly
  if (Platform.OS === "web") {
    return (
      <View style={styles.webContainer}>
        <div ref={cyRef} style={{ width: "100%", height: 400, borderRadius: 12, background: "#fff" }} />
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
