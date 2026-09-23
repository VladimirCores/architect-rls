*** Settings ***
Documentation    Shared settings and keywords for the RLS E2E suites.
...              Imports the robotframework-browser library (Playwright) so every
...              suite that needs browser/network access reuses the same library.
Library          Browser
Library          Collections

*** Variables ***
# Default target. Overridden by tests/e2e/run.sh (-v BASE_URL).
${BASE_URL}    http://127.0.0.1:3001

*** Keywords ***
Close All Browser Sessions
    # robotframework-browser (v20) exposes `Close Browser` (singular); tolerate
    # the case where no browser is open (e.g. a test was skipped before launch).
    Run Keyword And Ignore Error    Close Browser
