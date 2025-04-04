class Game {
  constructor() {
    this.score = 0;
    this.isRunning = false;
    this.gameArea = document.getElementById("gameArea");
    this.scoreElement = document.getElementById("score");
    this.startButton = document.getElementById("startButton");
    this.gameTime = 0; // Add game time tracking

    // Handle missing DOM elements gracefully
    if (!this.gameArea) {
      console.warn("Game area element not found, creating a default one");
      this.gameArea = document.createElement("div");
      this.gameArea.id = "gameArea";
      document.body.appendChild(this.gameArea);
    }

    if (!this.scoreElement) {
      console.warn("Score element not found, creating a default one");
      this.scoreElement = document.createElement("div");
      this.scoreElement.id = "score";
      document.body.appendChild(this.scoreElement);
    }

    if (!this.startButton) {
      console.warn("Start button not found, creating a default one");
      this.startButton = document.createElement("button");
      this.startButton.id = "startButton";
      this.startButton.textContent = "Start Game";
      document.body.appendChild(this.startButton);
    }

    // Adjusted game constants for better physics
    this.GRAVITY = 0.3;
    this.JUMP_FORCE = -10;
    this.MOVE_SPEED = 4;

    // Initialize game state
    this.initializeGame();

    if (this.startButton) {
      this.startButton.addEventListener("click", () => this.startGame());
    }
    this.setupEventListeners();
  }

  initializeGame() {
    // Player properties
    this.player = {
      x: 50,
      y: 50,
      width: 30,
      height: 30,
      velocityY: 0,
      velocityX: 0,
      isJumping: false,
    };

    // Platforms
    this.platforms = [
      { x: 0, y: 400, width: 200, height: 20 },
      { x: 250, y: 350, width: 200, height: 20 },
      { x: 500, y: 300, width: 200, height: 20 },
      { x: 0, y: 200, width: 200, height: 20 },
      { x: 250, y: 150, width: 200, height: 20 },
    ];

    // Collectibles
    this.collectibles = [
      { x: 100, y: 350, width: 20, height: 20, collected: false },
      { x: 350, y: 300, width: 20, height: 20, collected: false },
      { x: 600, y: 250, width: 20, height: 20, collected: false },
    ];
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (!this.isRunning) return;

      switch (e.key) {
        case "ArrowLeft":
          this.player.velocityX = -this.MOVE_SPEED;
          break;
        case "ArrowRight":
          this.player.velocityX = this.MOVE_SPEED;
          break;
        case " ":
          if (!this.player.isJumping) {
            this.player.velocityY = this.JUMP_FORCE;
            this.player.isJumping = true;
          }
          break;
      }
    });

    document.addEventListener("keyup", (e) => {
      if (!this.isRunning) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        this.player.velocityX = 0;
      }
    });
  }

  startGame() {
    // If game is running and restart is clicked, reset and restart
    if (this.isRunning) {
      this.resetGame();
      return;
    }

    // Clear any existing game over overlay
    const existingOverlay = this.gameArea.querySelector(".game-over-overlay");
    if (existingOverlay) {
      this.gameArea.removeChild(existingOverlay);
    }

    // Reset game state before starting
    this.resetGame();

    this.isRunning = true;
    this.startButton.textContent = "Restart Game";
    this.startButton.blur();
    this.gameTime = 0; // Reset game time when starting

    // Start the game loop
    this.gameLoop();
  }

  resetGame() {
    // Reset player position and state
    this.player.x = 50;
    this.player.y = 50;
    this.player.velocityY = 0;
    this.player.velocityX = 0;
    this.player.isJumping = false;

    // Reset score and collectibles
    this.score = 0;
    this.updateScore();
    this.collectibles.forEach((collectible) => {
      collectible.collected = false;
    });

    // Clear any existing game over overlay
    const existingOverlay = this.gameArea.querySelector(".game-over-overlay");
    if (existingOverlay) {
      this.gameArea.removeChild(existingOverlay);
    }

    this.gameTime = 0; // Reset game time
  }

  gameLoop() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => {
      if (this.isRunning) {
        this.update();
        this.draw();
        this.gameLoop();
      }
    });
  }

  update() {
    if (!this.isRunning) return;

    // Update game time
    this.gameTime += 16.67; // Approximately 60 FPS

    // Apply gravity
    this.player.velocityY += this.GRAVITY;

    // Store previous position for collision detection
    const prevX = this.player.x;
    const prevY = this.player.y;

    // Update player position
    this.player.x += this.player.velocityX;
    this.player.y += this.player.velocityY;

    // Check if player is out of bounds (game over condition)
    const gameAreaHeight = this.gameArea.getBoundingClientRect().height;
    if (this.player.y + this.player.height > gameAreaHeight) {
      this.gameOver();
      return;
    }

    // Check platform collisions
    this.player.isJumping = true;

    // Sort platforms by distance to player for better collision resolution
    const sortedPlatforms = [...this.platforms].sort((a, b) => {
      const distA =
        Math.abs(this.player.x - a.x) + Math.abs(this.player.y - a.y);
      const distB =
        Math.abs(this.player.x - b.x) + Math.abs(this.player.y - b.y);
      return distA - distB;
    });

    // First pass: Check and resolve vertical collisions
    for (const platform of sortedPlatforms) {
      if (this.checkCollision(this.player, platform)) {
        const fromTop = prevY + this.player.height <= platform.y;
        const fromBottom = prevY >= platform.y + platform.height;

        if (fromTop) {
          this.player.y = platform.y - this.player.height;
          this.player.velocityY = 0;
          this.player.isJumping = false;
          break;
        } else if (fromBottom) {
          this.player.y = platform.y + platform.height;
          this.player.velocityY = 0;
          break;
        }
      }
    }

    // Second pass: Check and resolve horizontal collisions
    for (const platform of sortedPlatforms) {
      if (this.checkCollision(this.player, platform)) {
        const fromLeft = prevX + this.player.width <= platform.x;
        const fromRight = prevX >= platform.x + platform.width;

        if (fromLeft) {
          this.player.x = platform.x - this.player.width;
          this.player.velocityX = 0;
          break;
        } else if (fromRight) {
          this.player.x = platform.x + platform.width;
          this.player.velocityX = 0;
          break;
        }
      }
    }

    // Final pass: Ensure no collisions remain
    for (const platform of sortedPlatforms) {
      if (this.checkCollision(this.player, platform)) {
        // If still colliding, try to resolve by moving the player out
        const dx =
          this.player.x +
          this.player.width / 2 -
          (platform.x + platform.width / 2);
        const dy =
          this.player.y +
          this.player.height / 2 -
          (platform.y + platform.height / 2);

        if (Math.abs(dx) > Math.abs(dy)) {
          // Move horizontally
          if (dx > 0) {
            this.player.x = platform.x + platform.width;
          } else {
            this.player.x = platform.x - this.player.width;
          }
          this.player.velocityX = 0;
        } else {
          // Move vertically
          if (dy > 0) {
            this.player.y = platform.y + platform.height;
          } else {
            this.player.y = platform.y - this.player.height;
          }
          this.player.velocityY = 0;
        }
      }
    }

    // Apply boundary constraints
    const gameAreaWidth = this.gameArea.getBoundingClientRect().width;
    if (this.player.x < 0) {
      this.player.x = 0;
      this.player.velocityX = 0;
    } else if (this.player.x + this.player.width > gameAreaWidth) {
      this.player.x = gameAreaWidth - this.player.width;
      this.player.velocityX = 0;
    }

    if (this.player.y < 0) {
      this.player.y = 0;
      this.player.velocityY = 0;
    }

    // Check collectible collisions
    this.collectibles.forEach((collectible) => {
      if (
        !collectible.collected &&
        this.checkCollision(this.player, collectible)
      ) {
        collectible.collected = true;
        this.score += 10;
        this.updateScore();
      }
    });
  }

  draw() {
    // Store the game over overlay if it exists
    const gameOverOverlay = this.gameArea.querySelector(".game-over-overlay");

    // Clear the game area
    this.gameArea.innerHTML = "";

    // Draw platforms
    this.platforms.forEach((platform) => {
      const platformElement = document.createElement("div");
      platformElement.style.position = "absolute";
      platformElement.style.left = platform.x + "px";
      platformElement.style.top = platform.y + "px";
      platformElement.style.width = platform.width + "px";
      platformElement.style.height = platform.height + "px";
      platformElement.style.backgroundColor = "#8B4513";
      this.gameArea.appendChild(platformElement);
    });

    // Draw collectibles
    this.collectibles.forEach((collectible) => {
      if (!collectible.collected) {
        const collectibleElement = document.createElement("div");
        collectibleElement.style.position = "absolute";
        collectibleElement.style.left = collectible.x + "px";
        collectibleElement.style.top = collectible.y + "px";
        collectibleElement.style.width = collectible.width + "px";
        collectibleElement.style.height = collectible.height + "px";
        collectibleElement.style.backgroundColor = "#FFD700";
        collectibleElement.style.borderRadius = "50%";
        this.gameArea.appendChild(collectibleElement);
      }
    });

    // Draw player
    const playerElement = document.createElement("div");
    playerElement.style.position = "absolute";
    playerElement.style.left = this.player.x + "px";
    playerElement.style.top = this.player.y + "px";
    playerElement.style.width = this.player.width + "px";
    playerElement.style.height = this.player.height + "px";
    playerElement.style.backgroundColor = "#FF0000";
    this.gameArea.appendChild(playerElement);

    // Restore the game over overlay if it existed
    if (gameOverOverlay) {
      this.gameArea.appendChild(gameOverOverlay);
    }
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  updateScore() {
    if (this.scoreElement) {
      this.scoreElement.textContent = this.score;
    }
  }

  gameOver() {
    this.isRunning = false;

    if (!this.gameArea) {
      console.warn("Game area not found, cannot show game over screen");
      return;
    }

    // Create game over overlay
    const gameOverOverlay = document.createElement("div");
    gameOverOverlay.className = "game-over-overlay";
    gameOverOverlay.style.position = "fixed";
    gameOverOverlay.style.top = "0";
    gameOverOverlay.style.left = "0";
    gameOverOverlay.style.width = "100%";
    gameOverOverlay.style.height = "100%";
    gameOverOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    gameOverOverlay.style.display = "flex";
    gameOverOverlay.style.flexDirection = "column";
    gameOverOverlay.style.justifyContent = "center";
    gameOverOverlay.style.alignItems = "center";
    gameOverOverlay.style.color = "white";
    gameOverOverlay.style.fontSize = "24px";
    gameOverOverlay.style.zIndex = "9999";

    // Create game over message
    const gameOverMessage = document.createElement("div");
    gameOverMessage.textContent = "Game Over!";
    gameOverMessage.style.marginBottom = "20px";
    gameOverMessage.style.fontSize = "48px";
    gameOverMessage.style.fontWeight = "bold";
    gameOverMessage.style.color = "#FF4444";
    gameOverMessage.style.textShadow = "2px 2px 4px rgba(0, 0, 0, 0.5)";

    // Create final score message
    const finalScore = document.createElement("div");
    finalScore.textContent = `Final Score: ${this.score}`;
    finalScore.style.marginBottom = "10px";
    finalScore.style.fontSize = "32px";
    finalScore.style.color = "#FFD700";

    // Create stats container
    const statsContainer = document.createElement("div");
    statsContainer.style.marginBottom = "30px";
    statsContainer.style.textAlign = "center";
    statsContainer.style.fontSize = "18px";
    statsContainer.style.color = "#CCCCCC";

    // Calculate collectibles stats
    const totalCollectibles = this.collectibles.length;
    const collectedCount = this.collectibles.filter((c) => c.collected).length;
    const collectiblesPercentage = Math.round(
      (collectedCount / totalCollectibles) * 100
    );

    // Add stats information
    const statsText = document.createElement("div");
    const timePlayed = Math.floor(this.gameTime / 1000);
    statsText.innerHTML = `
      <div style="margin-bottom: 10px;">Collectibles: ${collectedCount}/${totalCollectibles} (${collectiblesPercentage}%)</div>
      <div>Time Played: ${timePlayed} seconds</div>
    `;
    statsContainer.appendChild(statsText);

    // Create controls info
    const controlsInfo = document.createElement("div");
    controlsInfo.style.marginBottom = "30px";
    controlsInfo.style.textAlign = "center";
    controlsInfo.style.fontSize = "16px";
    controlsInfo.style.color = "#AAAAAA";
    controlsInfo.innerHTML = `
      <div style="margin-bottom: 5px;">Controls:</div>
      <div>← → : Move Left/Right</div>
      <div>Space : Jump</div>
    `;

    // Create restart button
    const restartButton = document.createElement("button");
    restartButton.textContent = "Play Again";
    restartButton.style.padding = "15px 30px";
    restartButton.style.fontSize = "20px";
    restartButton.style.cursor = "pointer";
    restartButton.style.backgroundColor = "#4CAF50";
    restartButton.style.color = "white";
    restartButton.style.border = "none";
    restartButton.style.borderRadius = "8px";
    restartButton.style.transition = "all 0.3s ease";
    restartButton.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";

    // Add hover effect
    restartButton.onmouseover = () => {
      restartButton.style.backgroundColor = "#45a049";
      restartButton.style.transform = "scale(1.05)";
    };
    restartButton.onmouseout = () => {
      restartButton.style.backgroundColor = "#4CAF50";
      restartButton.style.transform = "scale(1)";
    };

    restartButton.addEventListener("click", () => {
      // Remove overlay and reset game state
      this.gameArea.removeChild(gameOverOverlay);

      // Reset all game state
      this.player = {
        x: 50,
        y: 50,
        width: 30,
        height: 30,
        velocityY: 0,
        velocityX: 0,
        isJumping: false,
      };

      this.score = 0;
      this.updateScore();
      this.startButton.textContent = "Restart Game";

      // Reset collectibles
      this.collectibles.forEach((collectible) => {
        collectible.collected = false;
      });

      // Set running state and start game loop
      this.isRunning = true;
      this.gameLoop();
    });

    // Add elements to overlay
    gameOverOverlay.appendChild(gameOverMessage);
    gameOverOverlay.appendChild(finalScore);
    gameOverOverlay.appendChild(statsContainer);
    gameOverOverlay.appendChild(controlsInfo);
    gameOverOverlay.appendChild(restartButton);

    // Add overlay to game area
    this.gameArea.appendChild(gameOverOverlay);
  }

  // Add more game methods here
}

// Initialize the game when the page loads
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    const game = new Game();
  });
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = Game;
} else if (typeof window !== "undefined") {
  window.Game = Game;
}
