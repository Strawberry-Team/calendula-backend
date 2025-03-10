import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { BASE_URL, createAndLoginUser, expectResponseHeaders, generateHeaders, generateUserData } from "./helpers/auth.helpers.js";

dotenv.config({ path: '.env.test', debug: true });

const DEFAULT_CALENDAR_FIELDS = {
    id: undefined,
    title: 'Calendula Dev Team',
    description: 'Stand-ups, retrospectives, planning sprints and product demos',
    creationByUserId: undefined,
    creationAt: undefined,
};

function generateCalendarData(base = {}, overrides = {}) {
    return {
        ...DEFAULT_CALENDAR_FIELDS,
        ...base,
        ...overrides
    };
}

function expectCalendarDataToMatch(expected, actual) {
    expect(actual).toMatchObject({
        id: expected.id ?? expect.any(Number),
        title: expected.title,
        description: expected.description,
        creationByUserId: expected.creationByUserId,
        creationAt: expect.any(String)
    });
}

async function expectCalendarResponse(response, expectedData, statusCode = 200) {
    expectResponseHeaders(response, statusCode);
    const responseBody = await response.json();
    expectCalendarDataToMatch(expectedData, responseBody.data);
    return responseBody;
}

test.describe('Calendars', () => {
    test.describe.configure({mode: 'serial', timeout: 2000});

    let userData = {};
    let calendarData = {};
    let headers = {};

    test.beforeAll('Create and login user', async ({ request}) => {
        const user = await createAndLoginUser(request);
        userData = generateUserData(user);
        calendarData = generateCalendarData({}, { creationByUserId: userData.id });
        headers = generateHeaders(userData.accessToken);
    });

    test("Create Calendar", async ({request}) => {
        const response = await request.post(`${BASE_URL}/calendars/`, {
            headers: headers,
            data: {
                title: calendarData.title,
                description: calendarData.description
            }
        });

        const responseBody = await expectCalendarResponse(response, calendarData, 201);
        calendarData.id = responseBody.data.id;
    });

    test("Get Calendar", async ({request}) => {
        const response = await request.get(`${BASE_URL}/calendars/${calendarData.id}`, {
            headers: headers
        });

        await expectCalendarResponse(response, calendarData);
    });

    test("Update Calendar", async ({request}) => {
        calendarData.title = "Sports activities";
        calendarData.description = "Schedule of gym classes and bike rides";

        const response = await request.patch(`${BASE_URL}/calendars/${calendarData.id}`, {
            headers: headers,
            data: {
                title: calendarData.title,
                description: calendarData.description
            }
        });

        await expectCalendarResponse(response, calendarData);
    });

    test("Delete Calendar", async ({request}) => {
        const response = await request.delete(`${BASE_URL}/calendars/${calendarData.id}`, {
            headers: headers
        });

        await expectCalendarResponse(response, calendarData);
    });
});
