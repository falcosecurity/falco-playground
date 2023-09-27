describe("Page Loading and Functionality Tests", () => {
  beforeEach(() => {
    // Load the home page before each test
    cy.visit("/");
  });

  // Test: Navigate to different sections via navigation bars
  it("should check for navigation bars", () => {
    // Verify that navigation bars exist
    cy.contains("Blog");
    cy.contains("Docs");
    cy.contains("Community");
    cy.contains("About");
  });

  // Test: Verify the presence of Monaco Editor
  it("should validate the presence of Monaco Editor", () => {
    cy.get(".monaco-editor").should("exist");
  });

  // Test: Verify button states, and check the terminal for the current date
  it("should check for the presence of Buttons and Terminal", () => {
    const buttons = [
      "Run",
      "Import Yaml",
      "Copy",
      "Download",
      "Load Examples",
      "Run with scap",
      "Share",
      "Upload scap and run",
    ];

    // Check that all buttons are enabled and contain the expected text
    buttons.forEach((buttonText) => {
      cy.get("button")
        .should("be.enabled")
        .contains(buttonText);
    });

    // Check if the terminal contains the current date
    const date = new Date();
    cy.get(".terminal-success").contains(date.getDate(), { timeout: 25000 });
  });

  // Test: Download 'rule.yaml' when 'Download' button is clicked
  it("should download 'rule.yaml' when 'Download' button is clicked", () => {
    cy.get("button:contains('Download')").click();
    cy.get("a[download='rule.yaml']").should("exist");
  });

  // Test: Load examples and verify that 'Example 1' is displayed
  it("should load examples and verify that 'Example 1' is displayed", () => {
    cy.get("button:contains('Load Examples')").click();
    cy.contains("Example 1").click();
    cy.get(".monaco-editor").should("not.be.empty");
  });

  // Test: Copy the correct URL to the clipboard when 'Share' is triggered and load 'Example 1'
  it("should copy the correct URL to the clipboard when 'Share' is triggered and load 'Example 1'", () => {
    // Define the expected URL based on your component's behavior
    cy.get("button:contains('Load Examples')").click();
    cy.contains("Example 1").click();

    // Using the example URL generated from example 1 to verify the share functionality
    const example1URL = "LQAgtghgxgTg9gLhHADgUwHYH0ZogEwCgQQo4N8BLAF0vKQAo0A3agOmoE90RKMQGqTABohGCNVHpx1AEwBKEBAogW7SgGcsYnHnwBeajACuaJSoBm%2BDtzRQAFhBj6A5BZfn8IK2wzGwAHz6AAzyhISgJgA2aEgASnogAMr2aFFRIADC5BaUAObGMBJ0%2FABilDHEIPhoGlBIACJo1HbUStQtYCjUGiDUcCC4BCAaqemkOfmFxeTeFbUgAEacIBjkwKNpGSjweUVgGlVkFDQlSAFVJDpDXspEJCQMPrkx4mBmfAKb6VjHuXlYF6YCDvDSKOAwS4kHxvD78BjfKK%2FSYAoFg5CQh7Q6xUXBQfowFafBFjJF%2FfJYXGtCGUWryRR3KEMNZtHZwKC%2BEFwr6krCLPhOWlgsIkYGLGL4JAWCBRDRoKpwYzUFBK85QiAjUkTDD%2Faa0WZAkAAdwgvRuSxWGrWGA2WrZexBAmMcucAFJnWgYJz3iAPTAsFE4Hk%2BMZKAZ3S62IHg34wxMwJAKPpXWyOVAwPgonwzCgw8nU2xc14gcmYVztdQINn%2FXnXcdK9W2HHKJA8mhk%2FWqxhPU3W2g2LgUHANDQIZwRSAdnQYDROAgoQB1ACCcQAcgBJVcAcSqlbyGiQAG17MPJBWu57hHMYhpOBpOlewDRcJTNGRmJ7OFeACoARgArAALAAbGwwTBIBAC6hBAA%3D%3D";
    const expectedURL = `${Cypress.config().baseUrl}#/?code=${example1URL}`;

    // Stub the clipboard.writeText method to capture the copied URL
    cy.stub(navigator.clipboard, "writeText").callsFake((text) => {
      // Assert that the copied URL matches the expected URL
      expect(text).to.equal(expectedURL);
      return Promise.resolve();
    });

    // Trigger the 'Share' functionality by clicking the "Share" button
    cy.contains("Share").click();

    // Check that a success message is displayed (assuming it's shown)
    cy.contains("Copied URL to clipboard").should("exist"); // Replace with your message selector
  });
});
