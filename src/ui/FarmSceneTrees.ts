import type { Coordinate, Tree } from "../game/model";
import { treeVisuals } from "./FarmSceneVisuals";

interface TreeGraphics {
  rect(x: number, y: number, width: number, height: number): TreeGraphics;
  circle(x: number, y: number, radius: number): TreeGraphics;
  fill(color: number): TreeGraphics;
  stroke(style: { color: number; width: number }): TreeGraphics;
}

export function drawTrees(
  graphics: TreeGraphics,
  trees: Tree[],
  getCellPosition: (x: number, y: number) => Coordinate,
) {
  for (const tree of trees) {
    const position = getCellPosition(tree.position.x, tree.position.y);
    const centerX = position.x + 36;
    const centerY = position.y + 36;
    const visual = treeVisuals[tree.status];

    graphics.rect(centerX - 6, centerY - 2, 12, 25).fill(visual.trunkColor);

    if (tree.status === "available") {
      graphics
        .circle(centerX, centerY - 10, visual.canopyRadius)
        .fill(visual.canopyColor)
        .stroke({
          color: 0x24552d,
          width: 2,
        });
    } else {
      graphics
        .circle(centerX, centerY + 19, visual.stumpRadius)
        .fill(visual.trunkColor)
        .stroke({
          color: 0x4f301e,
          width: 2,
        });
    }
  }
}
