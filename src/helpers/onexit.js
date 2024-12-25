// Helper for handling exit events
// note: this isn't working
export function onExit(f) {
  const signals = ["exit", "SIGINT", "SIGTERM", "SIGQUIT", "uncaughtException"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down...`);

      try {
        await f();
        process.exit(0);
      } catch (e) {
        console.error(e);
      }
    });
  });
}
