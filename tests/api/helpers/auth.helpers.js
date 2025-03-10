import { expect } from '@playwright/test';
import UserModel from "../../../src/user/model.js";

export const BASE_URL = 'http://localhost:8080/api';
const HEADERS = { 'Content-Type': 'application/json' };
const userModel = new UserModel();

function getDefaultUserFields() {
    return {
        id: undefined,
        email: `ann.nichols${Date.now()}@example.com`,
        fullName: 'Ann Nichols',
        country: 'Ukraine',
        password: 'StrongPassword123!$',
        password_confirm: 'StrongPassword123!$',
        confirmToken: undefined,
        accessToken: undefined,
    }
}
export function generateUserData(base = {}, overrides = {}) {
    const defaults = getDefaultUserFields();
    return {
        ...defaults,
        ...base,
        ...overrides
    };
}

export function expectResponseHeaders(response, statusCode = 200) {
    expect(response.status()).toBe(statusCode);
    const headers = response.headers();
    expect(headers).toHaveProperty('content-type');
    expect(headers['content-type']).toContain('application/json');
}

export async function registerUser(request, userData) {
    const response = await request.post(`${BASE_URL}/auth/register`, {
        headers: HEADERS,
        data: {
            email: userData.email,
            fullName: userData.fullName,
            country: userData.country,
            password: userData.password,
            password_confirm: userData.password_confirm
        }
    });

    expectResponseHeaders(response, 201);
    const responseBody = await response.json();
    expect(responseBody).toMatchObject({
        data: {
            id: expect.any(Number),
            fullName: userData.fullName,
            email: userData.email,
            country: userData.country,
        }
    });

    const user = await userModel.getEntityById(responseBody.data.id);
    expect(user).toMatchObject({
        id: expect.any(Number),
        fullName: userData.fullName,
        email: userData.email,
        country: userData.country,
        confirmToken: expect.any(String)
    });
    userData.id = user.id;
    userData.confirmToken = user.confirmToken;

    return { userData, responseBody };
}

export async function confirmUserEmail(request, userData) {
    const response = await request.get(`${BASE_URL}/auth/confirm-email/${userData.confirmToken}`, {
        params: {
            confirm_token: userData.confirmToken
        }
    });

    expectResponseHeaders(response);
    const responseBody = await response.json();
    expect(responseBody).toMatchObject({
        message: 'Successful email confirmation'
    });

    const user = await userModel.getEntityById(userData.id);
    expect(user).toMatchObject({
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        country: userData.country,
        isVerified: 1
    });
    user.password = userData.password;
    Object.assign(userData, user);

    return { userData, responseBody };
}

export async function loginUser(request, userData) {
    const response = await request.post(`${BASE_URL}/auth/login`, {
        headers: HEADERS,
        data: {
            email: userData.email,
            password: userData.password
        }
    });

    expectResponseHeaders(response);
    const responseBody = await response.json();
    expect(responseBody).toMatchObject({
        message: 'Successful login',
        accessToken: expect.any(String),
        data: {
            id: expect.any(Number),
            fullName: userData.fullName,
            email: userData.email,
            profilePicture: expect.any(String),
            country: userData.country,
            role: 'user',
            isVerified: 1,
        }
    });
    userData.accessToken = responseBody.accessToken;

    return { userData, responseBody };
}

export async function createAndLoginUser(request, overrideUserData = {}) {
    const user = generateUserData(overrideUserData);
    await registerUser(request, user);
    await confirmUserEmail(request, user);
    const { userData } = await loginUser(request, user);
    return userData;
}

export function generateHeaders(accessToken) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };
}
