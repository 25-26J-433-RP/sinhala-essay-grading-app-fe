# Cytoscape Mindmap Integration

## Overview
This React Native app includes a mindmap visualization feature for student essays using Cytoscape.js rendered in a WebView.


### File Structure
1. **`app/api/mindmap.ts`** - API service to fetch mindmap data from backend
2. **`components/MindmapView.tsx`** - Reusable Cytoscape mindmap component
3. **`app/essay-mindmap.tsx`** - Dedicated screen for viewing essay mindmaps
4. **`app/student-essays.tsx`** - Added "View Mindmap" button for each essay

## Features

### Mindmap Visualization
- **Interactive Pan & Zoom**: Pinch to zoom, drag to pan
- **Node Types**: Root, Topic, and Subtopic nodes with different colors
  - Root nodes: Blue (#4A90E2)
  - Topic nodes: Green (#7ED321)
  - Subtopic nodes: Orange (#F5A623)
- **Hierarchical Layout**: Breadthfirst algorithm for clean tree structure
- **Responsive Design**: Nodes sized based on hierarchy level
- **Sinhala Text Support**: Full Unicode support for Sinhala labels

### Navigation Flow
1. Student Essays Screen → Click "View Mindmap" button
2. Essay Mindmap Screen → Interactive visualization with metadata

## API Integration

### Generate Mindmap Endpoint
```
POST {EXPO_PUBLIC_MINDMAP_API_URL}/api/mindmap/generate
```

**Payload:**
```json
{
  "essay_id": "string",
  "text": "string"
}
```


**Response:**
```json
{
  "success": true,
  "message": "Mindmap generated successfully",
  "essay_id": "string"
}
```

### Fetch Mindmap Endpoint
```
GET {EXPO_PUBLIC_MINDMAP_API_URL}/api/mindmap/essay/{essayId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "root1",
        "label": "ශ්‍රී ලංකාව දකුණු ආසියාවේ පිහිටි දිවයිනකි",
        "level": 0,
        "type": "root",
        "size": 30
      },
      {
        "id": "topic1",
        "label": "සුන්දර වෙරළ තීරයන්",
        "level": 1,
        "type": "topic",
        "size": 20
      }
    ],
    "edges": [
      {
        "id": "edge1",
        "source": "root1",
        "target": "topic1",
        "type": "hierarchy"
      }
    ],
    "metadata": {
      "total_nodes": 2,
      "total_edges": 1,
      "text_length": 90
    }
  }
}
```

### Workflow
1. User enters essay text and clicks "Score Essay"
2. System scores the essay and saves to Firebase
3. System calls `/api/mindmap/generate` with `essay_id` and `text`
4. System fetches generated mindmap from `/api/mindmap/essay/{essayId}`
5. Mindmap is displayed inline in the essay detail view

## Dependencies
- `react-native-webview` - For rendering HTML/JS in React Native
- `cytoscape` (CDN) - Graph visualization library loaded via CDN in WebView


## Future Enhancements
- Add node click handlers to show detailed information
- Export mindmap as image
- Real-time collaborative editing
- Different layout algorithms (force-directed, circular, etc.)
- Color coding based on essay scores or topics
- Search/filter nodes
