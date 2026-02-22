

## Link Analysis Improvements

### 1. Community Activity - Show Top 5 with "See More" Pagination

**Current behavior:** All communities are displayed at once.

**New behavior:**
- Initially show only the **top 5 communities** sorted by activity
- Display a "See More" button below them
- Each click loads **10 more** communities
- Continue until all communities are shown, then hide the button

**Changes in `src/pages/Analysis.tsx`:**
- Add a `visibleCommunities` state, initialized to 5
- Slice `linkData.userToCommunities` to `visibleCommunities`
- Add a "See More" button that increments by 10
- Hide button when all communities are visible

### 2. Network Graph - Make Interactive (Draggable + Clickable)

**Current behavior:** The canvas graph is static (no mouse interaction). Nodes cannot be clicked or dragged.

**New behavior:**
- **Clickable nodes:** Clicking a community node opens `https://www.reddit.com/r/{community}` in a new tab. Clicking a user node opens `https://www.reddit.com/user/{username}` in a new tab.
- **Draggable nodes:** Users can click and drag nodes to reposition them.
- **Cursor feedback:** Cursor changes to pointer when hovering over a node.

**Changes in `src/components/UserCommunityNetworkGraph.tsx`:**
- Add mouse event listeners (`mousedown`, `mousemove`, `mouseup`, `click`) to the canvas
- Implement hit-detection to determine which node the mouse is over
- On drag: update the dragged node's position and restart simulation briefly
- On click (without drag): open the appropriate Reddit URL in a new tab
- Change cursor to `pointer` when hovering over a node
- Remove `'interest'` from the icon map and color definitions
- Remove the "Interests (Related Communities)" legend item

### 3. Remove Interest Type from Graph

- Remove the `interest` entry from `nodeColors`, `nodeGradients`, and the icons map
- Remove the "Interests" legend item from the bottom of the graph component

### Technical Details

**State additions in Analysis.tsx:**
```
const [visibleCommunities, setVisibleCommunities] = useState(5);
```
Reset to 5 in `handleLinkAnalysis`.

**Mouse interaction in UserCommunityNetworkGraph.tsx:**
- Track `isDragging`, `dragNode`, and `mouseDownPos` refs
- `mousedown`: find node under cursor, start drag
- `mousemove`: if dragging, update node position; always update cursor style
- `mouseup`: end drag
- `click`: if no significant drag occurred, open Reddit link for the clicked node
- Helper: `getNodeAtPosition(x, y)` checks distance from mouse to each node center

