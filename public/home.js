import { $, $show, $hide } from "./utils.js";
import pageElts from "./pageElts.js";
import * as game from "./game.js";

const playButtonElt = $(".home button.play");

playButtonElt.addEventListener("click", (event) => {
  event.preventDefault();

  $hide(pageElts.home);
  game.enterGame();
});

export function enterHome() {
  $show(pageElts.home);
}
