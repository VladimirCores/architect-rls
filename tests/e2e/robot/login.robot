*** Settings ***
Documentation    E2E example for the `POST /api/v1/login` route.
...              Driven by robotframework-browser: a headless Chromium navigates
...              to the backend origin and the `Http` keyword issues the request,
...              so no Swagger UI or extra container is required.
Resource         ../Resources/common.robot
Test Timeout     30 seconds
Suite Setup      Start Browser On Backend Origin
Suite Teardown   Close All Browser Sessions

*** Variables ***
${LOGIN_BODY}    {"username": "operator_1", "password": "securePassword123"}
${BAD_BODY}      {"username": "operator_1", "password": "wrong-password-99"}

*** Test Cases ***
Login Succeeds And Returns Profile
    [Documentation]    POST /api/v1/login with valid credentials returns 200 and the user profile.
    ${res}=    Http    ${BASE_URL}/api/v1/login    POST    ${LOGIN_BODY}
    ${status}=    Get From Dictionary    ${res}    status
    Should Be Equal As Numbers    ${status}    200
    ${profile}=    Get From Dictionary    ${res}    body
    ${username}=    Get From Dictionary    ${profile}    username
    ${role}=    Get From Dictionary    ${profile}    role
    ${uid}=    Get From Dictionary    ${profile}    uid
    ${features}=    Get From Dictionary    ${profile}    features
    Should Be Equal As Strings    ${username}    operator_1
    Should Be Equal As Strings    ${role}    user
    Should Be Equal As Strings    ${uid}    123e4567-e89b-12d3-a456-426614174000
    List Should Contain Value    ${features}    radar.export
    List Should Contain Value    ${features}    session.history

Login Fails With Invalid Credentials
    [Documentation]    POST /api/v1/login with a wrong password returns 401 with a Problem document.
    ${res}=    Http    ${BASE_URL}/api/v1/login    POST    ${BAD_BODY}
    ${status}=    Get From Dictionary    ${res}    status
    Should Be Equal As Numbers    ${status}    401
    ${error}=    Get From Dictionary    ${res}    body
    ${err_status}=    Get From Dictionary    ${error}    status
    ${title}=    Get From Dictionary    ${error}    title
    Should Be Equal As Numbers    ${err_status}    401
    Should Contain    ${title}    Invalid credentials

*** Keywords ***
Start Browser On Backend Origin
    [Documentation]    Launch headless Chromium and navigate to the backend so `Http` requests are same-origin (no CORS).
    New Browser    chromium
    New Page    ${BASE_URL}/health
