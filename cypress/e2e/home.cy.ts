// SPDX-License-Identifier: Apache-2.0
/*
Copyright (C) 2023 The Falco Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

import "cypress-file-upload";

describe("Page Loading and Functionality Tests", () => {
  beforeEach(() => {
    // Load the home page before each test
    cy.visit("/");
  });

  it("check for navigation bars", () => {
    // Verify that navigation bars exist
    cy.contains("Blog");
    cy.contains("Docs");
    cy.contains("Community");
    cy.contains("About");
  });

  it("validate the presence of Monaco Editor", () => {
    cy.get(".monaco-editor").should("exist");
  });

  it("check for the presence of Buttons and Terminal", () => {
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
      cy.get("button").should("be.enabled").contains(buttonText);
    });

    // Check if the terminal contains the current date
    const date = new Date();
    cy.get(".terminal-success").contains(date.getDate(), { timeout: 25000 });
  });

  it("download 'rule.yaml' when 'Download' button is clicked", () => {
    cy.get("button:contains('Download')").click();
    cy.get("a[download='rule.yaml']").should("exist");

    // Using the default cypress download path. ie cypress/downloads
    const downloadsFolder = Cypress.config("downloadsFolder");

    // Check if any file with the '.yaml' extension exists in the downloads folder
    cy.readFile(`${downloadsFolder}/rule.yaml`).should("exist");
  });

  it("load examples and verify that 'Example 1' is displayed", () => {
    cy.get("button:contains('Load Examples')").click();
    cy.contains("Example 1").click();
    cy.get(".monaco-editor").should("not.be.empty");
  });

  // Test: Copy the correct URL to the clipboard when 'Share' is triggered and load 'Example 1'
  it("copy the correct URL to the clipboard when 'Share' is triggered and load 'Example 1'", () => {
    // Define the expected URL based on your component's behavior
    // Using the example URL generated from example 1 to verify the share functionality
    cy.wait(4000).get("button:contains('Share')").focus().click();
    const example1URL =
      "LQAgtghgxgTg9gLhHADgUwHYH0ZogEwCgQQo4N8BLAF0vKQAo0A3agOmoE90RKMQGqTABohGCNVHpx1AEwBKEBAogW7SgGcsYnHnwBeajACuaJSoBm%2BDtzRQAFhBj6A5BZfn8IK2wzGwAHz6AAzyhISgJgA2aEgASnogAMr2aFFRIADC5BaUAObGMBJ0%2FABilDHEIPhoGlBIACJo1HbUStQtYCjUGiDUcCC4BCAaqemkOfmFxeTeFbUgAEacIBjkwKNpGSjweUVgGlVkFDQlSAFVJDpDXspEJCQMPrkx4mBmfAKb6VjHuXlYF6YCDvDSKOAwS4kHxvD78BjfKK%2FSYAoFg5CQh7Q6xUXBQfowFafBFjJF%2FfJYXGtCGUWryRR3KEMNZtHZwKC%2BEFwr6krCLPhOWlgsIkYGLGL4JAWCBRDRoKpwYzUFBK85QiAjUkTDD%2Faa0WZAkAAdwgvRuSxWGrWGA2WrZexBAmMcucAFJnWgYJz3iAPTAsFE4Hk%2BMZKAZ3S62IHg34wxMwJAKPpXWyOVAwPgonwzCgw8nU2xc14gcmYVztdQINn%2FXnXcdK9W2HHKJA8mhk%2FWqxhPU3W2g2LgUHANDQIZwRSAdnQYDROAgoQB1ACCcQAcgBJVcAcSqlbyGiQAG17MPJBWu57hHMYhpOBpOlewDRcJTNGRmJ7OFeACoARgArAALAAbGwwTBIBAC6hBAA%3D%3D";
    const expectedURL = `${Cypress.config().baseUrl}/#/?code=${example1URL}`;

    // Check that a success message is displayed (assuming it's shown)
    cy.contains("Copied URL to clipboard").should("exist");

    // Check that the correct URL is copied to the clipboard
    cy.task("getClipboard").should("eq", expectedURL);
  });

  // Test: Import a YAML file and verify that the editor is populated with the YAML content
  it("import a YAML file and verify that the editor is populated", () => {
    // Wait for the button to become visible and then click it
    cy.get("button:contains('Import Yaml')").should("be.visible").click();

    // Upload the file
    cy.get("input[type='file']").as("fileUpload");
    cy.fixture("rule.yaml").then((fileContent) => {
      cy.get("@fileUpload").attachFile({
        fileContent: fileContent.toString(),
        fileName: "rule.yaml",
        mimeType: "application/yaml",
      });
    });

    // Wait for the editor to load and check if it's not empty
    cy.get(".monaco-editor")
      .should("be.visible") // Ensure the editor is visible
      .then(($editor) => {
        // Get the text content of the editor and assert that it's not empty
        const editorText = $editor.text();
        expect(editorText).not.to.be.empty;
      });
  });

  // Test: Import a scap file and verify that the editor is populated with the scap content
  it("import a Scap file and run with example", () => {
    // Wait for the button to become visible and then click it
    cy.get("button:contains('Upload scap and run')")
      .should("be.visible")
      .click();

    // Upload the file
    cy.get("input[accept='.scap']").as("fileUpload");
    cy.fixture("example.scap").then((fileContent) => {
      cy.get("@fileUpload").attachFile({
        fileContent: fileContent.toString(),
        fileName: "example.scap",
      });
    });

    cy.contains("Compiling with example.scap").should("be.visible");

    // Wait for the editor to load and check if it's not empty
    cy.get(".monaco-editor")
      .should("be.visible") // Ensure the editor is visible
      .then(($editor) => {
        // Get the text content of the editor and assert that it's not empty
        const editorText = $editor.text();
        expect(editorText).not.to.be.empty;
      });
  });

  // Test: Run with scap example Connect_localhost.scap
  it("import a Scap file and run using dropdown", () => {
    // Wait for the button to become visible and then click it
    cy.contains("Run with scap").click();
    cy.contains("Connect_localhost.scap").click();

    cy.contains("Loading example").should("be.visible");
    cy.contains("Compiling with connect_localhost.scap").should("be.visible");

    // Wait for the editor to load and check if it's not empty
    cy.get(".monaco-editor")
      .should("be.visible") // Ensure the editor is visible
      .then(($editor) => {
        // Get the text content of the editor and assert that it's not empty
        const editorText = $editor.text();
        expect(editorText).not.to.be.empty;
      });
  });
});
