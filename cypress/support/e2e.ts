import "./commands";

// To prevent Cypress from terminating before tests run due to an unhandled exception on the application side
Cypress.on("uncaught:exception", (err, runnable) => {
  return false;
});