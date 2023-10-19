import "./commands";

// Avoiding uncaught exceptions from the application to prevent Cypress from finishing
Cypress.on("uncaught:exception", (err, runnable) => {
  return false;
});