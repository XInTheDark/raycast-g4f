// Minimal test script
import { onExit } from "#root/src/helpers/onexit.js";

onExit(async () => {
	process.stderr.write('Cleanup function called\n');
	process.exit(0);
});

// Force an exit to test
setTimeout(() => {
	process.stderr.write('Forcing exit\n');
	process.exit(7);
}, 1000);