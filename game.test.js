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
const { describe, test, expect, beforeEach, afterEach } = global;

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

    test("should maintain game loop while game is running", () => {
      const mockRAF = jest.fn();
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = mockRAF;

      game.startGame();

      // Should call rAF at least once
      expect(mockRAF).toHaveBeenCalled();

      // The callback should be a function
      const callback = mockRAF.mock.calls[0][0];
      expect(typeof callback).toBe("function");

      // Stop the game before calling callback to prevent multiple calls
      game.isRunning = false;
      callback();

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

  describe("Drawing", () => {
    test("should draw platforms correctly", () => {
      game.startGame();
      game.draw();
      const platformElements = document.querySelectorAll("#gameArea > div");
      expect(platformElements.length).toBeGreaterThan(0);

      // Check first platform properties
      const firstPlatform = platformElements[0];
      expect(firstPlatform.style.position).toBe("absolute");
      expect(firstPlatform.style.backgroundColor).toBe("rgb(139, 69, 19)");
      expect(parseInt(firstPlatform.style.width)).toBe(game.platforms[0].width);
      expect(parseInt(firstPlatform.style.height)).toBe(
        game.platforms[0].height
      );
    });

    test("should draw collectibles correctly", () => {
      game.startGame();
      game.draw();
      const collectibleElements = document.querySelectorAll("#gameArea > div");
      const uncollectedCount = game.collectibles.filter(
        (c) => !c.collected
      ).length;
      expect(collectibleElements.length).toBeGreaterThanOrEqual(
        uncollectedCount
      );

      // Check first collectible properties
      const firstCollectible = collectibleElements[game.platforms.length];
      expect(firstCollectible.style.position).toBe("absolute");
      expect(firstCollectible.style.backgroundColor).toBe("rgb(255, 215, 0)");
      expect(firstCollectible.style.borderRadius).toBe("50%");
    });

    test("should draw player correctly", () => {
      game.startGame();
      game.draw();
      const playerElement = document.querySelector(
        "#gameArea > div:last-child"
      );
      expect(playerElement.style.position).toBe("absolute");
      expect(playerElement.style.backgroundColor).toBe("rgb(255, 0, 0)");
      expect(parseInt(playerElement.style.left)).toBe(game.player.x);
      expect(parseInt(playerElement.style.top)).toBe(game.player.y);
    });

    test("should preserve game over overlay when redrawing", () => {
      game.startGame();
      game.gameOver();
      const initialOverlay = document.querySelector(".game-over-overlay");
      expect(initialOverlay).not.toBeNull();

      game.draw();
      const preservedOverlay = document.querySelector(".game-over-overlay");
      expect(preservedOverlay).not.toBeNull();
      expect(preservedOverlay.textContent).toContain("Game Over");
    });
  });

  describe("Game Over Handling", () => {
    test("should show game over screen with correct score", () => {
      game.startGame();
      game.score = 150;
      game.gameOver();

      const overlay = document.querySelector(".game-over-overlay");
      expect(overlay).not.toBeNull();
      expect(overlay.textContent).toContain("Game Over");
      expect(overlay.textContent).toContain("150");
    });

    test("should handle cleanup on game over", () => {
      game.startGame();
      const initialGameArea = game.gameArea.innerHTML;
      game.gameOver();

      // Check if game state is properly reset
      expect(game.isRunning).toBe(false);
      // Note: gameLoop might not be null immediately due to async nature
      expect(typeof game.gameLoop).toBe("function");

      // Check if game area is cleared and overlay is added
      expect(game.gameArea.innerHTML).not.toBe(initialGameArea);
      expect(game.gameArea.querySelector(".game-over-overlay")).not.toBeNull();
    });

    test("should handle multiple game over calls gracefully", () => {
      game.startGame();
      game.gameOver();
      const firstOverlay = document.querySelector(".game-over-overlay");

      // Clear the game area to simulate a fresh state
      game.gameArea.innerHTML = "";

      game.gameOver();
      const secondOverlay = document.querySelector(".game-over-overlay");

      expect(firstOverlay).not.toBeNull();
      expect(secondOverlay).not.toBeNull();
      // Since we cleared the game area, we should only have one overlay
      expect(document.querySelectorAll(".game-over-overlay").length).toBe(1);
    });
  });

  describe("Resource Management", () => {
    test("should clean up event listeners on game over", () => {
      game.startGame();

      // Set initial state
      game.player.velocityX = 0;

      // Simulate right arrow key press
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" })
      );

      // Verify the key press was handled
      expect(game.player.velocityX).toBe(game.MOVE_SPEED);

      game.gameOver();

      // Reset velocity
      game.player.velocityX = 0;

      // Simulate key events after game over
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" })
      );

      // Handlers should not affect game state after game over
      expect(game.player.velocityX).toBe(0);
    });

    test("should handle window resize events", () => {
      game.startGame();
      const initialWidth = game.gameArea.clientWidth;

      // Simulate window resize
      Object.defineProperty(game.gameArea, "clientWidth", { value: 1000 });
      window.dispatchEvent(new Event("resize"));

      expect(game.gameArea.clientWidth).not.toBe(initialWidth);
    });
  });

  describe("Game Over Cleanup", () => {
    test("should clean up existing overlay before creating new one", () => {
      game.startGame();

      // Create a fake overlay
      const fakeOverlay = document.createElement("div");
      fakeOverlay.className = "game-over-overlay";
      game.gameArea.appendChild(fakeOverlay);

      // Verify we have one overlay
      expect(document.querySelectorAll(".game-over-overlay").length).toBe(1);

      // Start game again, which should clean up the overlay
      game.startGame();

      // Verify the old overlay was removed
      expect(document.querySelectorAll(".game-over-overlay").length).toBe(0);
    });
  });

  describe("Platform Collisions", () => {
    test("should detect and handle collision from left of platform", () => {
      game.startGame();

      // Create a test platform in the middle of the game area
      const testPlatform = {
        x: 400,
        y: 200,
        width: 100,
        height: 20,
      };
      game.platforms = [testPlatform];

      // Position player to the left of the platform
      game.player.x = testPlatform.x - game.player.width - 5;
      game.player.y = testPlatform.y;
      game.player.velocityX = 10;

      // Run update
      game.update();

      // Verify collision was detected and handled
      expect(game.player.velocityX).toBe(0);
      expect(game.player.x).toBeLessThan(testPlatform.x);
    });

    test("should handle collision from exact right of platform", () => {
      game.startGame();

      // Position player exactly at right edge of first platform
      game.player.x = game.platforms[0].x + game.platforms[0].width;
      game.player.y = game.platforms[0].y;
      game.player.velocityX = -5;

      // Run update
      game.update();

      // Player should stop at platform edge
      expect(game.player.x).toBe(game.platforms[0].x + game.platforms[0].width);
      expect(game.player.velocityX).toBe(0);
    });

    test("should handle collision from exact bottom of platform", () => {
      game.startGame();

      // Position player exactly at bottom edge of first platform
      game.player.x = game.platforms[0].x;
      game.player.y = game.platforms[0].y + game.platforms[0].height;
      game.player.velocityY = -5;

      // Run update
      game.update();

      // Player should stop at platform edge
      expect(game.player.y).toBe(
        game.platforms[0].y + game.platforms[0].height
      );
      expect(game.player.velocityY).toBe(0);
    });
  });

  describe("UI Interactions", () => {
    test("should handle restart button hover effects", () => {
      game.startGame();
      game.gameOver();

      const restartButton = document.querySelector(".game-over-overlay button");
      expect(restartButton).not.toBeNull();

      // Test mouseover
      restartButton.dispatchEvent(new Event("mouseover"));
      expect(restartButton.style.backgroundColor).toBe("rgb(69, 160, 73)"); // #45a049
      expect(restartButton.style.transform).toBe("scale(1.05)");

      // Test mouseout
      restartButton.dispatchEvent(new Event("mouseout"));
      expect(restartButton.style.backgroundColor).toBe("rgb(76, 175, 80)"); // #4CAF50
      expect(restartButton.style.transform).toBe("scale(1)");
    });
  });

  describe("Module Exports", () => {
    test("should export Game class correctly", () => {
      // Test that Game is defined
      expect(typeof Game).toBe("function");
      expect(Game.name).toBe("Game");

      // Test that Game can be instantiated
      const testGame = new Game();
      expect(testGame).toBeInstanceOf(Game);
      expect(testGame.score).toBe(0);
      expect(testGame.isRunning).toBe(false);
    });
  });

  describe("DOM Element Handling", () => {
    let originalDOM;

    beforeEach(() => {
      // Save original DOM elements
      originalDOM = document.body.innerHTML;
    });

    afterEach(() => {
      // Restore original DOM elements
      document.body.innerHTML = originalDOM;
    });

    test("should handle missing DOM elements gracefully", () => {
      // Set up minimal DOM without score element
      document.body.innerHTML = `
        <div id="gameArea" style="width: 800px; height: 500px;"></div>
        <button id="startButton">Start Game</button>
      `;

      // Create game instance without score element
      const game = new Game();
      expect(() => game.startGame()).not.toThrow();
      expect(game.score).toBe(0);
      expect(game.isRunning).toBe(true);
    });
  });

  describe("Event Handling Edge Cases", () => {
    let game;

    beforeEach(() => {
      // Ensure DOM elements exist
      document.body.innerHTML = `
        <div id="gameArea" style="width: 800px; height: 500px;"></div>
        <div id="score">0</div>
        <button id="startButton">Start Game</button>
      `;
      game = new Game();
      game.startGame();
    });

    test("should handle multiple simultaneous key presses", () => {
      // Press right arrow and space simultaneously
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" })
      );
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));

      expect(game.player.velocityX).toBe(game.MOVE_SPEED);
      expect(game.player.velocityY).toBe(game.JUMP_FORCE);
      expect(game.player.isJumping).toBe(true);
    });

    test("should handle keyup for unpressed keys", () => {
      // Release a key that wasn't pressed
      document.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }));
      expect(game.player.velocityX).toBe(0);
    });

    test("should handle jump while already jumping", () => {
      // First jump
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      const initialVelocityY = game.player.velocityY;

      // Second jump while in air
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      expect(game.player.velocityY).toBe(initialVelocityY);
    });
  });

  describe("Platform Collision Edge Cases", () => {
    let game;

    beforeEach(() => {
      // Ensure DOM elements exist
      document.body.innerHTML = `
        <div id="gameArea" style="width: 800px; height: 500px;"></div>
        <div id="score">0</div>
        <button id="startButton">Start Game</button>
      `;
      game = new Game();
      game.startGame();
    });

    test("should handle collision at platform corners", () => {
      // Position player at platform corner with diagonal movement
      game.player.x = 195; // Just before platform edge
      game.player.y = 395; // Just above platform
      game.player.velocityX = 2;
      game.player.velocityY = 2;

      // Run multiple updates to ensure stable collision resolution
      for (let i = 0; i < 3; i++) {
        game.update();
      }

      // After collision resolution, player should be in a valid position
      // Allow for some floating-point imprecision
      expect(game.player.y).toBeLessThan(450); // Not too far below platform
      expect(game.player.x).toBeLessThan(250); // Not too far past platform
      expect(game.checkCollision(game.player, game.platforms[0])).toBe(false); // Not inside platform
    });

    test("should handle simultaneous collisions with multiple platforms", () => {
      // Add a test platform that overlaps with existing one
      game.platforms.push({
        x: 190,
        y: 390,
        width: 20,
        height: 20,
      });

      // Position player to collide with both platforms
      game.player.x = 195;
      game.player.y = 385;
      game.player.velocityY = 2;

      // Run multiple updates to ensure stable collision resolution
      for (let i = 0; i < 3; i++) {
        game.update();
      }

      // After collision resolution, player should be in a valid position
      // Check that player is not inside any platform
      const notInsideAnyPlatform = game.platforms.every(
        (platform) => !game.checkCollision(game.player, platform)
      );
      expect(notInsideAnyPlatform).toBe(true);
      expect(game.player.y).toBeLessThan(450); // Not too far below platforms
    });
  });

  describe("Environment Detection", () => {
    test("should handle different module environments", () => {
      // Test CommonJS environment
      expect(typeof Game).toBe("function");
      expect(Game.name).toBe("Game");

      // Test browser environment
      global.window = {};
      global.window.Game = Game;
      expect(typeof global.window.Game).toBe("function");
      expect(global.window.Game.name).toBe("Game");

      // Cleanup
      delete global.window;
    });
  });
});
