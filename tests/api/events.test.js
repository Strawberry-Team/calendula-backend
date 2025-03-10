import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { BASE_URL, createAndLoginUser, expectResponseHeaders, generateHeaders, generateUserData } from "./helpers/auth.helpers.js";

dotenv.config({ path: '.env.test', debug: true });

const DEFAULT_EVENT_FIELDS = {
    id: undefined,
    creationByUserId: undefined,
    title: 'Database Modeling',
    description: 'Discussion of requirements, business logic, clarification of team composition',
    category: 'work',
    type: 'meeting',
    startAt: '2023-03-09 14:00:00',
    endAt: '2023-03-09 15:00:00',
    creationAt: undefined,
};

function generateEventData(base = {}, overrides = {}) {
    return {
        ...DEFAULT_EVENT_FIELDS,
        ...base,
        ...overrides
    };
}

function expectEventDataToMatch(expected, actual) {
    expect(actual).toMatchObject({
        id: expected.id ?? expect.any(Number),
        creationByUserId: expected.creationByUserId ?? expect.any(Number),
        title: expected.title,
        description: expected.description,
        category: expected.category,
        type: expected.type,
        startAt: expected.startAt,
        endAt: expected.endAt,
        creationAt: expect.any(String)
    });
}

async function expectEventResponse(response, expectedData, statusCode = 200) {
    expectResponseHeaders(response, statusCode);
    const responseBody = await response.json();
    expectEventDataToMatch(expectedData, responseBody.data);
    return responseBody;
}

test.describe('Events', () => {
    test.describe.configure({mode: 'serial', timeout: 2000});

    let userData = {};
    let eventData = {};
    let headers = {};

    test.beforeAll('Create and login user', async ({ request }) => {
        const user = await createAndLoginUser(request);
        userData = generateUserData(user);
        eventData = generateEventData({}, { creationByUserId: userData.id });
        headers = generateHeaders(userData.accessToken);
    });

    test("Create Event", async ({request}) => {
        const response = await request.post(`${BASE_URL}/events/`, {
            headers: headers,
            data: {
                title: eventData.title,
                description: eventData.description,
                category: eventData.category,
                type: eventData.type,
                startAt: eventData.startAt,
                endAt: eventData.endAt
            }
        });
        const responseBody = await expectEventResponse(response, eventData, 201);
        eventData.id = responseBody.data.id;
    });

    test("Get Event", async ({request}) => {
        const response = await request.get(`${BASE_URL}/events/${eventData.id}`, {
            headers: headers
        });

        await expectEventResponse(response, eventData);
    });

    test("Update Event", async ({request}) => {
        eventData = generateEventData(eventData, {
            title: 'Frontend: Auth',
            description: 'Creating user flow for authorisation',
            category: 'work',
            type: 'task',
            startAt: '2023-03-11 10:00:00',
            endAt: '2023-03-11 13:00:00'
        });
        const response = await request.patch(`${BASE_URL}/events/${eventData.id}`, {
            headers: headers,
            data: {
                title: eventData.title,
                description: eventData.description,
                category: eventData.category,
                type: eventData.type,
                startAt: eventData.startAt,
                endAt: eventData.endAt
            }
        });

        await expectEventResponse(response, eventData);
    });

    test("Delete Event", async ({request}) => {
        const response = await request.delete(`${BASE_URL}/events/${eventData.id}`, {
            headers: headers
        });

        await expectEventResponse(response, eventData, 200);
    });
});
