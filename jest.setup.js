// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  setTimeout(callback, 0);
  return 0;
};

// Mock cancelAnimationFrame
global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock console.log to keep test output clean
global.console.log = () => {};
