// Mock DOM elements
document.body.innerHTML = `
  <div id="gameArea" style="width: 800px; height: 500px;"></div>
  <div id="score">0</div>
  <button id="startButton">Start Game</button>
`;

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = function () {
  return {
    width: this.style.width ? parseInt(this.style.width) : 0,
    height: this.style.height ? parseInt(this.style.height) : 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => {},
  };
};

// Import the Game class
const Game = require("./game.js");

// Import Jest globals
const { describe, test, expect, beforeEach } = global;

describe("Game", () => {
  let game;

  beforeEach(() => {
    // Create a new game instance before each test
    game = new Game();
  });

  describe("Initialization", () => {
    test("should initialize with correct default values", () => {
      expect(game.score).toBe(0);
      expect(game.isRunning).toBe(false);
      expect(game.player.x).toBe(50);
      expect(game.player.y).toBe(50);
      expect(game.platforms.length).toBe(5);
      expect(game.collectibles.length).toBe(3);
    });
  });

  describe("Game Start", () => {
    test("should start game when start button is clicked", () => {
      game.startGame();
      expect(game.isRunning).toBe(true);
      expect(game.score).toBe(0);
      expect(document.getElementById("startButton").textContent).toBe(
        "Restart Game"
      );
    });

    test("should reset game when restart button is clicked", () => {
      // Start the game
      game.startGame();
      // Modify some game state
      game.score = 100;
      game.player.x = 200;
      game.player.y = 200;
      // Click restart
      game.startGame();
      // Check if state is reset
      expect(game.score).toBe(0);
      expect(game.player.x).toBe(50);
      expect(game.player.y).toBe(50);
    });
  });

  describe("Player Movement", () => {
    test("should move player left when left arrow is pressed", () => {
      game.startGame();
      const initialX = game.player.x;
      // Simulate left arrow key press
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft" })
      );
      expect(game.player.velocityX).toBe(-game.MOVE_SPEED);
    });

    test("should move player right when right arrow is pressed", () => {
      game.startGame();
      // Simulate right arrow key press
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" })
      );
      expect(game.player.velocityX).toBe(game.MOVE_SPEED);
    });

    test("should allow player to jump when space is pressed", () => {
      // Start game but don't start the game loop
      game.isRunning = true;
      // Simulate space key press
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      // Check velocity immediately after key press
      expect(game.player.velocityY).toBe(game.JUMP_FORCE);
      expect(game.player.isJumping).toBe(true);

      // Now run update to see gravity effect
      game.update();
      expect(game.player.velocityY).toBe(game.JUMP_FORCE + game.GRAVITY);
    });
  });

  describe("Collision Detection", () => {
    test("should detect collision between player and platform", () => {
      const player = { x: 0, y: 0, width: 30, height: 30 };
      const platform = { x: 0, y: 0, width: 100, height: 20 };
      expect(game.checkCollision(player, platform)).toBe(true);
    });

    test("should not detect collision when objects are not touching", () => {
      const player = { x: 0, y: 0, width: 30, height: 30 };
      const platform = { x: 100, y: 100, width: 100, height: 20 };
      expect(game.checkCollision(player, platform)).toBe(false);
    });

    test("should resolve horizontal collision from right", () => {
      game.startGame();
      // Position player just before platform
      game.player.x = 180;
      game.player.y = 380;
      game.player.velocityX = 5;
      // Run update to apply collision
      game.update();
      // Check if player stopped at platform edge
      expect(Math.abs(game.player.velocityX)).toBeLessThanOrEqual(5);
      expect(game.player.x).toBeLessThanOrEqual(200);
      expect(game.player.x).toBeGreaterThanOrEqual(170);
    });

    test("should resolve horizontal collision from left", () => {
      game.startGame();
      // Position player just after platform
      game.player.x = 220;
      game.player.y = 380;
      game.player.velocityX = -5;
      // Run update to apply collision
      game.update();
      // Check if player stopped at platform edge
      expect(Math.abs(game.player.velocityX)).toBeLessThanOrEqual(5);
      expect(game.player.x).toBeGreaterThanOrEqual(200);
      expect(game.player.x).toBeLessThanOrEqual(230);
    });

    test("should resolve vertical collision from above", () => {
      game.startGame();
      // Position player above platform
      game.player.x = 100;
      game.player.y = 330;
      game.player.velocityY = 5;
      // Run update to apply collision
      game.update();
      // Check if player landed on platform
      expect(Math.abs(game.player.velocityY)).toBeLessThanOrEqual(5.5);
      expect(game.player.y).toBeLessThanOrEqual(400);
      expect(game.player.y).toBeGreaterThanOrEqual(300);
      expect(game.player.isJumping).toBe(true); // Will be false on next frame
    });

    test("should resolve vertical collision from below", () => {
      game.startGame();
      // Position player below platform
      game.player.x = 100;
      game.player.y = 370;
      game.player.velocityY = -5;
      // Run update to apply collision
      game.update();
      // Check if player stopped at platform bottom
      expect(Math.abs(game.player.velocityY)).toBeLessThanOrEqual(5);
      expect(game.player.y).toBeGreaterThanOrEqual(350);
      expect(game.player.y).toBeLessThanOrEqual(420);
    });
  });

  describe("Boundary Checks", () => {
    test("should prevent player from going off left edge", () => {
      game.startGame();
      game.player.x = -10;
      game.player.velocityX = -5;
      game.update();
      expect(game.player.x).toBe(0);
      expect(game.player.velocityX).toBe(0);
    });

    test("should prevent player from going off right edge", () => {
      game.startGame();
      game.player.x = 770; // Near right edge
      game.player.velocityX = 5;
      game.update();
      expect(game.player.x).toBe(770); // Should stop at edge
      expect(game.player.velocityX).toBe(0);
    });

    test("should prevent player from going above game area", () => {
      game.startGame();
      game.player.y = -10;
      game.player.velocityY = -5;
      game.update();
      expect(game.player.y).toBe(0);
      expect(game.player.velocityY).toBe(0);
    });
  });

  describe("Game Time Tracking", () => {
    test("should track game time correctly", () => {
      game.startGame();
      const initialTime = game.gameTime;
      game.update();
      expect(game.gameTime).toBeGreaterThan(initialTime);
      expect(game.gameTime).toBeLessThanOrEqual(initialTime + 17); // 60 FPS ≈ 16.67ms
    });

    test("should display correct time in game over screen", () => {
      game.startGame();
      // Simulate some game time
      for (let i = 0; i < 60; i++) {
        game.update(); // 60 updates ≈ 1 second
      }
      game.gameOver();
      const overlay = document.querySelector(".game-over-overlay");
      expect(overlay.textContent).toContain("Time Played: 1 seconds");
    });
  });

  describe("Event Listeners", () => {
    test("should stop horizontal movement on keyup", () => {
      game.startGame();
      // Start moving right
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" })
      );
      expect(game.player.velocityX).toBe(game.MOVE_SPEED);
      // Stop moving
      document.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight" }));
      expect(game.player.velocityX).toBe(0);
    });

    test("should not respond to key events when game is not running", () => {
      // Try to move without starting game
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" })
      );
      expect(game.player.velocityX).toBe(0);
    });
  });

  describe("Game Loop", () => {
    test("should stop game loop when game is over", () => {
      game.startGame();
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = jest.fn();

      game.gameOver();
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();

      window.requestAnimationFrame = originalRAF;
    });
  });

  describe("Game Over", () => {
    test("should trigger game over when player falls off screen", () => {
      game.startGame();
      // Set player position below game area
      game.player.y = 600; // Above the game area height (500px)
      // Run one update cycle
      game.update();
      expect(game.isRunning).toBe(false);
    });

    test("should show game over overlay with correct score", () => {
      game.startGame();
      game.score = 100;
      game.gameOver();
      const overlay = document.querySelector(".game-over-overlay");
      expect(overlay).toBeTruthy();
      expect(overlay.textContent).toContain("Game Over!");
      expect(overlay.textContent).toContain("Final Score: 100");
    });

    test("should properly restart game when clicking play again button", () => {
      // Start game and trigger game over
      game.startGame();
      game.score = 100;
      game.player.x = 200;
      game.player.y = 200;
      game.gameOver();

      // Mock requestAnimationFrame and update method
      const originalRAF = window.requestAnimationFrame;
      const originalUpdate = game.update;
      window.requestAnimationFrame = jest.fn();
      game.update = jest.fn();

      // Find and click the play again button
      const overlay = document.querySelector(".game-over-overlay");
      const restartButton = overlay.querySelector("button");
      restartButton.click();

      // Verify game state before any updates
      expect(game.isRunning).toBe(true);
      expect(game.score).toBe(0);
      expect(game.player.x).toBe(50);
      expect(game.player.y).toBe(50);
      expect(document.querySelector(".game-over-overlay")).toBeNull();
      expect(document.getElementById("startButton").textContent).toBe(
        "Restart Game"
      );
      expect(document.getElementById("score").textContent).toBe("0");

      // Verify requestAnimationFrame was called but update wasn't
      expect(window.requestAnimationFrame).toHaveBeenCalled();
      expect(game.update).not.toHaveBeenCalled();

      // Restore original methods
      window.requestAnimationFrame = originalRAF;
      game.update = originalUpdate;
    });
  });

  describe("Collectibles", () => {
    test("should collect items and update score", () => {
      game.startGame();
      const initialScore = game.score;
      // Position player on a collectible
      game.player.x = game.collectibles[0].x;
      game.player.y = game.collectibles[0].y;
      // Run one update cycle
      game.update();
      expect(game.score).toBe(initialScore + 10);
      expect(game.collectibles[0].collected).toBe(true);
    });
  });
});
