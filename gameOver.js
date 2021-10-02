import gameStats from "./gameStats.js";
import { $, $show, $hide } from "./utils.js";
import pageElts from "./pageElts.js";
import * as game from "./game.js";

const playButtonElt = $(".gameOver button.play");

playButtonElt.addEventListener("click", (event) => {
  event.preventDefault();

  $hide(pageElts.gameOver);
  game.enterGame();
});

export function enterGameOver() {
  $show(pageElts.gameOver);
}
