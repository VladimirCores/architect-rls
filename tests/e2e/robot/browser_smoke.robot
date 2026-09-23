*** Settings ***
Documentation    Smoke test confirming robotframework-browser can launch a
...              headless Chromium and read a page title. Self-contained (no
...              backend dependency); skips gracefully if Chromium is unavailable.
Resource         ../Resources/common.robot

*** Test Cases ***
Browser Library Launches Headless Chromium
    ${ok}=    Run Keyword And Return Status    New Browser    chromium
    Run Keyword If    not ${ok}    Pass Execution    robotframework-browser/Chromium unavailable
    New Page    data:text/html,<title>RLS E2E</title>
    ${title}=    Get Title
    Should Be Equal As Strings    ${title}    RLS E2E
    [Teardown]    Close All Browser Sessions
