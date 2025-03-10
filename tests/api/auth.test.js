import { test, expect } from '@playwright/test';
import { BASE_URL, registerUser, confirmUserEmail, loginUser, generateUserData, expectResponseHeaders } from "./helpers/auth.helpers.js";
import dotenv from 'dotenv';
import UserModel from "./../../src/user/model.js";

dotenv.config({ path: '.env.test', debug: true });

const HEADERS = { 'Content-Type': 'application/json' };
const userModel = new UserModel();

test.describe('Authentication', () => {
    test.describe.configure({ mode: 'serial', timeout: 2000 });

    let testUser = generateUserData();

    test('User registration', async ({ request }) => {
       await registerUser(request, testUser);
    });

    test('Confirm the user`s email by token', async ({ request }) => {
        const { userData } = await confirmUserEmail(request, testUser);
        Object.assign(testUser, userData);
    });

    test('User login', async ({ request }) => {
        const { userData } = await loginUser(request, testUser);
        testUser.accessToken = userData.accessToken;
    });

    test('User logout', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/auth/logout`, );

        expectResponseHeaders(response);
        const responseBody = await response.json();
        expect(responseBody).toMatchObject({
            message: 'Successful logout'
        });
    });

    test('Send a password recovery email', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/auth/password-reset`, {
            headers: HEADERS,
            data: {
                email: testUser.email
            }
        });

        expectResponseHeaders(response);
        const responseBody = await response.json();
        expect(responseBody).toMatchObject({
            message: 'Successful send an email'
        });

        const user = await userModel.getEntityById(testUser.id);
        expect(user).toMatchObject({
            passwordResetToken: expect.any(String)
        });
        testUser.passwordResetToken = user.passwordResetToken;
    });

    test('Confirm password recovery by token', async ({ request }) => {
        testUser.new_password = 'NewStrongPassword123!$';
        const response = await request.post(`${BASE_URL}/auth/password-reset/${testUser.passwordResetToken}`, {
            params: {
                confirm_token: testUser.passwordResetToken
            },
            headers: HEADERS,
            data: {
                password: testUser.new_password,
                password_confirm: testUser.new_password
            }
        });

        expectResponseHeaders(response);
        const responseBody = await response.json();
        expect(responseBody).toMatchObject({
            message: 'Successful password update'
        });

        const user = await userModel.getEntityById(testUser.id);
        expect(user).toMatchObject({
            password: expect.any(String)
        });
    });

    test('User login with new password', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/auth/login`, {
            headers: HEADERS,
            data: {
                email: testUser.email,
                password: testUser.new_password
            }
        });

        expectResponseHeaders(response);
        const responseBody = await response.json();
        expect(responseBody).toMatchObject({
            message: 'Successful login',
            accessToken: expect.any(String),
            data: {
                id: testUser.id,
                fullName: testUser.fullName,
                email: testUser.email,
                country: testUser.country,
                profilePicture: testUser.profilePicture,
                isVerified: testUser.isVerified,
                role: testUser.role,
                creationAt: expect.any(String)
            }
        });
        testUser.accessToken = responseBody.accessToken;
    });

    test('Final user logout', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/auth/logout`);
        expectResponseHeaders(response);
        const responseBody = await response.json();
        expect(responseBody).toMatchObject({
            message: 'Successful logout'
        });
    });
});