class Game {
  constructor(gameAreaId = "gameArea", scoreElementId = "score") {
    this.score = 0;
    this.isRunning = false;
    this.gameArea = document.getElementById(gameAreaId);
    this.scoreElement = document.getElementById(scoreElementId);
    this.startButton = document.getElementById("startButton");
    this.gameTime = 0; // Add game time tracking

    // Handle missing DOM elements gracefully
    if (!this.gameArea) {
      console.warn("Game area element not found, creating a default one");
      this.gameArea = document.createElement("div");
      this.gameArea.id = gameAreaId;
      document.body.appendChild(this.gameArea);
    }

    if (!this.scoreElement) {
      console.warn("Score element not found, creating a default one");
      this.scoreElement = document.createElement("div");
      this.scoreElement.id = scoreElementId;
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
    // Reset game state
    this.score = 0;
    this.gameTime = 0;
    this.isRunning = true;

    // Reset player position and velocity
    this.player = {
      x: 50,
      y: 50,
      width: 30,
      height: 30,
      velocityX: 0,
      velocityY: 0,
      isJumping: false,
    };

    // Reset collectibles
    this.collectibles = this.collectibles.map((c) => ({
      ...c,
      collected: false,
    }));

    // Update score display
    this.scoreElement.textContent = "0";

    // Remove any existing overlays
    const gameOverOverlay = this.gameArea.querySelector(".game-over-overlay");
    const successOverlay = this.gameArea.querySelector(".success-overlay");
    if (gameOverOverlay) {
      this.gameArea.removeChild(gameOverOverlay);
    }
    if (successOverlay) {
      this.gameArea.removeChild(successOverlay);
    }

    // Cancel any existing animation frame
    if (typeof window !== "undefined" && this.gameLoop) {
      window.cancelAnimationFrame(this.gameLoop);
    }

    // Start the game loop
    this.gameLoop();
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

    // Store initial time
    const initialTime = this.gameTime;

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

    // First pass: Check and resolve vertical collisions
    for (const platform of this.platforms) {
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
    for (const platform of this.platforms) {
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
    for (const platform of this.platforms) {
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

    // Check for collectible collisions
    let allCollected = true;
    for (const collectible of this.collectibles) {
      if (
        !collectible.collected &&
        this.checkCollision(this.player, collectible)
      ) {
        collectible.collected = true;
        this.score += 10;
        this.updateScore();
      }
      if (!collectible.collected) {
        allCollected = false;
      }
    }

    // Check if all collectibles are collected
    if (allCollected) {
      this.isRunning = false; // Stop the game
      this.gameTime = initialTime; // Revert time to before the update
      this.showSuccessMessage();
      return;
    }

    // Draw the game state
    this.draw();
  }

  draw() {
    // Store both overlays if they exist
    const gameOverOverlay = this.gameArea.querySelector(".game-over-overlay");
    const successOverlay = this.gameArea.querySelector(".success-overlay");

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

    // Restore the overlays if they existed
    if (gameOverOverlay) {
      this.gameArea.appendChild(gameOverOverlay);
    }
    if (successOverlay) {
      this.gameArea.appendChild(successOverlay);
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

  showSuccessMessage() {
    this.isRunning = false;
    if (typeof window !== "undefined" && this.gameLoop) {
      window.cancelAnimationFrame(this.gameLoop);
    }

    // Remove existing overlays
    const existingOverlay = this.gameArea.querySelector(".success-overlay");
    if (existingOverlay) {
      this.gameArea.removeChild(existingOverlay);
    }

    // Create success overlay
    const overlay = document.createElement("div");
    overlay.className = "success-overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: Arial, sans-serif;
      z-index: 1000;
    `;

    // Add success content
    overlay.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px;">Congratulations!</h1>
      <p style="font-size: 24px; margin-bottom: 10px;">You collected all items!</p>
      <p style="font-size: 18px; margin-bottom: 20px;">Final Score: ${
        this.score
      }</p>
      <p style="font-size: 18px; margin-bottom: 20px;">Time Played: ${Math.floor(
        this.gameTime / 1000
      )} seconds</p>
      <button id="continueButton" style="
        padding: 10px 20px;
        font-size: 18px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s, transform 0.2s;
      ">Play Again</button>
    `;

    // Add hover effects to the continue button
    const continueButton = overlay.querySelector("#continueButton");
    continueButton.addEventListener("mouseover", () => {
      continueButton.style.backgroundColor = "#45a049";
      continueButton.style.transform = "scale(1.05)";
    });
    continueButton.addEventListener("mouseout", () => {
      continueButton.style.backgroundColor = "#4CAF50";
      continueButton.style.transform = "scale(1)";
    });

    // Add click handler for continue button
    continueButton.addEventListener("click", () => {
      this.resetGame();
    });

    // Add overlay to game area
    this.gameArea.appendChild(overlay);
  }

  gameOver() {
    this.isRunning = false;
    if (typeof window !== "undefined" && this.gameLoop) {
      window.cancelAnimationFrame(this.gameLoop);
    }

    // Remove existing overlays
    const existingOverlay = this.gameArea.querySelector(".game-over-overlay");
    if (existingOverlay) {
      this.gameArea.removeChild(existingOverlay);
    }

    // Create game over overlay
    const overlay = document.createElement("div");
    overlay.className = "game-over-overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: Arial, sans-serif;
      z-index: 1000;
    `;

    // Add game over content
    overlay.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px;">Game Over!</h1>
      <p style="font-size: 24px; margin-bottom: 10px;">Final Score: ${
        this.score
      }</p>
      <p style="font-size: 18px; margin-bottom: 20px;">Time Played: ${Math.floor(
        this.gameTime / 1000
      )} seconds</p>
      <button id="restartButton" style="
        padding: 10px 20px;
        font-size: 18px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s, transform 0.2s;
      ">Play Again</button>
    `;

    // Add hover effects to the restart button
    const restartButton = overlay.querySelector("#restartButton");
    restartButton.addEventListener("mouseover", () => {
      restartButton.style.backgroundColor = "#45a049";
      restartButton.style.transform = "scale(1.05)";
    });
    restartButton.addEventListener("mouseout", () => {
      restartButton.style.backgroundColor = "#4CAF50";
      restartButton.style.transform = "scale(1)";
    });

    // Add click handler for restart button
    restartButton.addEventListener("click", () => {
      this.resetGame();
    });

    // Add overlay to game area
    this.gameArea.appendChild(overlay);
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
