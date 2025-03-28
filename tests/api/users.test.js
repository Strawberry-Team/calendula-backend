import { test } from '@playwright/test';
import dotenv from 'dotenv';
import { generateHeaders, getEnv } from "./helpers/general.helpers.js";
import { createAndLoginUser, generateUserData, expectUserResponse, expectAllUsersResponse }
        from "./helpers/users.helpers.js";
import UserModel from "../../src/user/user-model.js";

const env = getEnv();
dotenv.config({path: `.env.${env}`, debug: env === 'test'});

test.describe('Users', () => {
    test.describe.configure({ mode: 'serial', timeout: 2000 });

    let userData = {};
    let headers = {};

    test.beforeAll('Create and login user', async ({ request}) => {
        const user = await createAndLoginUser(request);
        userData = generateUserData({}, user);
        headers = generateHeaders(userData.accessToken);
    });

    test("Get All Users", async ({request}) => {
        const response = await request.get(`users`, {
            headers
        });

        await expectAllUsersResponse(response, userData);
    });

    test("Get User", async ({request}) => {
        const response = await request.get(`users/${userData.id}`, {
            headers
        });

        await expectUserResponse(response, userData);
    });

    test("Update User", async ({request}) => {
        userData.password = "New" + userData.password;
        userData.password_confirm = userData.password;

        const response = await request.patch(`users/${userData.id}`, {
            headers,
            fullName: userData.fullName,
            password: userData.password,
            password_confirm: userData.password_confirm,
        });

        await expectUserResponse(response, userData);
    });

    test.afterAll("Cleanup of test data", async ({request}) => {
        const userModel = new UserModel();
        const user = await userModel.getByEmail(userData.email);
        await user.delete();
    });
});
