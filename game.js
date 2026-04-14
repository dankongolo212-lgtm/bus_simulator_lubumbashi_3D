let bus = document.getElementById("bus");
let game = document.getElementById("game");
let score = 0;
let busX = 125;

document.addEventListener("touchstart", moveBus);

function moveBus(e) {
  let x = e.touches[0].clientX;
  if (x < window.innerWidth / 2) {
    busX -= 50;
  } else {
    busX += 50;
  }
  busX = Math.max(0, Math.min(250, busX));
  bus.style.left = busX + "px";
}

function createCoin() {
  let coin = document.createElement("div");
  coin.classList.add("coin");
  coin.style.left = Math.random() * 270 + "px";
  coin.style.top = "0px";
  game.appendChild(coin);

  let fall = setInterval(() => {
    coin.style.top = coin.offsetTop + 5 + "px";

    // collision
    if (
      coin.offsetTop > 400 &&
      coin.offsetLeft > busX - 30 &&
      coin.offsetLeft < busX + 50
    ) {
      score++;
      document.getElementById("score").innerText = score;
      coin.remove();
      clearInterval(fall);
    }

    if (coin.offsetTop > 500) {
      coin.remove();
      clearInterval(fall);
    }
  }, 30);
}

function createObstacle() {
  let obs = document.createElement("div");
  obs.classList.add("obstacle");
  obs.style.left = Math.random() * 250 + "px";
  obs.style.top = "0px";
  game.appendChild(obs);

  let fall = setInterval(() => {
    obs.style.top = obs.offsetTop + 6 + "px";

    // collision = GAME OVER
    if (
      obs.offsetTop > 400 &&
      obs.offsetLeft > busX - 40 &&
      obs.offsetLeft < busX + 50
    ) {
      alert("Game Over ! Score: " + score);
      location.reload();
    }

    if (obs.offsetTop > 500) {
      obs.remove();
      clearInterval(fall);
    }
  }, 30);
}

// spawn
setInterval(createCoin, 1000);
setInterval(createObstacle, 1500);