# Viewport runtime

## State

`getProject().view`:

```js
{ x, y, zoom, grid }
```

Also mirrored: `runtime.showGrid`, `workspace.grid-off` class.

## Functions (extraction target)

| Function | Role |
|----------|------|
| `world(clientX, clientY)` | Screen → canvas coords |
| `updateViewport()` | Apply CSS transform + zoom label + minimap |
| `zoomAt(clientX, clientY, nextZoom)` | Zoom to cursor |
| `fitToScreen()` | Fit all visible nodes |

## Not extracted (handlers stay in monolith)

- `workspace` pointerdown pan / pinch
- `wheel` zoom
- `runtime.panning`, `runtime.pinch` state

## Dependencies

- `workspace`, `viewport` DOM refs
- `getProject`, `markDirty`
- `paintMinimap` (callback)
- `isNodeHiddenCanvas` (for fitToScreen)
- `getNodeWorldPosition`

## Module API

`createViewportRuntime(ctx, deps)` → `{ world, updateViewport, zoomAt, fitToScreen, getView, setView }`
