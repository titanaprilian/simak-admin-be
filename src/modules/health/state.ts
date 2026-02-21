let isShuttingDown = false;

export const healthState = {
  get shuttingDown() {
    return isShuttingDown;
  },
  markShuttingDown() {
    isShuttingDown = true;
  },
};
