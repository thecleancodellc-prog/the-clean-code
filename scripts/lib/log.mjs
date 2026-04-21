// Colored terminal logging for factory pipeline
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";
const GREEN = "\x1b[32m";
const CYAN  = "\x1b[36m";
const YELLOW= "\x1b[33m";
const RED   = "\x1b[31m";
const MAGENTA="\x1b[35m";

function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export function step(agent, msg) {
  console.log(`${BOLD}${CYAN}[${agent}]${RESET} ${DIM}${timestamp()}${RESET} ${msg}`);
}

export function info(agent, msg) {
  console.log(`${GREEN}  ✓${RESET} ${DIM}[${agent}]${RESET} ${msg}`);
}

export function warn(agent, msg) {
  console.log(`${YELLOW}  ⚠${RESET} ${DIM}[${agent}]${RESET} ${msg}`);
}

export function error(agent, msg) {
  console.log(`${RED}  ✗${RESET} ${BOLD}[${agent}]${RESET} ${msg}`);
}

export function divider(label) {
  const line = "─".repeat(50);
  console.log(`\n${MAGENTA}${line}${RESET}`);
  console.log(`${BOLD}${MAGENTA}  ${label}${RESET}`);
  console.log(`${MAGENTA}${line}${RESET}\n`);
}

export function done(msg) {
  console.log(`\n${BOLD}${GREEN}✔ ${msg}${RESET}\n`);
}
