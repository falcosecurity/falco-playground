describe("Check if page loads succesfully", () => {
  it("Load home page", () => {
    cy.visit("/");
  });
  it("Check for nav bars", () => {
    cy.visit("/");
    cy.contains("Blog");
    cy.contains("Docs");
    cy.contains("Community");
    cy.contains("About");
  });
  it("Check for Monaco Editor", () => {
    cy.visit("/");
    cy.get(".monaco-editor");
  });
  it("Check for Buttons", () => {
    cy.visit("/");
    cy.get("button").should("be.enabled").contains("Run");
    cy.get("button").should("be.enabled").contains("Import Yaml");
    cy.get("button").should("be.enabled").contains("Copy");
    cy.get("button").should("be.enabled").contains("Download");
    cy.get("button").should("be.enabled").contains("Load Examples");
    cy.get("button").should("be.enabled").contains("Run with scap");
  });
  it("Check if Terminal is loaded Properly,", () => {
    const date = new Date();
    cy.visit("/");
    cy.get(".terminal-success").contains(date.getDate(), { timeout: 20000 });
  });
});
