import Controller from "../controller.js";
import UserModel from "./model.js";
import { body } from "express-validator";
import Where from "../sql/where.js";
import CalendarModel from "../calendar/model.js";

/**
 * @property {UserModel} _model
 */
class UserController extends Controller {
    constructor() {
        super(new UserModel(), [
            body('email')
                .notEmpty().withMessage('Email address is required.')
                .isEmail().withMessage('Please enter a valid email address.')
                .isLength({ min: 3, max: 50 }).withMessage('Email must be between 3 and 50 characters long.'),

            body('fullName')
                .notEmpty().withMessage('Full name is required.')
                .isLength({ min: 1, max: 50 }).withMessage('Full name must be between 3 and 30 characters long.'),

            body('country')
                .notEmpty().withMessage('Country is required.')
                .isIn(['Ukraine', 'Finland', 'Estonia'])
                .withMessage('Allowed countries: Ukraine, Finland, Estonia.'),

            body('password')
                .optional()
                .isStrongPassword({ minLength: 5 })
                .withMessage("Password should be at least 5 characters long and include an uppercase letter, a symbol, and a number."),

            body('password_confirm')
                .custom((value, { req }) => {
                    if (req.body.password && !value) {
                        throw new Error('Please confirm your password.');
                    }
                    if (value !== req.body.password) {
                        throw new Error('Password confirmation does not match the password.');
                    }
                    return true;
                })]);

        this._validationRulesForUpdate = [
            body('fullName')
                .optional()
                .isLength({ max: 50 }).withMessage('Email must be between 3 and 50 characters long.'),

            body('password')
                .optional()
                .isStrongPassword({ minLength: 5 })
                .withMessage("Password should be at least 5 characters long and include an uppercase letter, a symbol, and a number."),

            body('password_confirm')
                .optional()
                .custom((value, { req }) => {
                    if (req.body.password && !value) {
                        throw new Error('Please confirm your password.');
                    }
                    if (value !== req.body.password) {
                        throw new Error('Password confirmation does not match the password.');
                    }
                    return true;
                })];

        this._accessPolicies.admin.setUpdate(this._model._fields.filter(field => !['email'].includes(field)));

        this._accessPolicies.user
            .removeCreate()
            .setRead([], [])
            .setUpdate(this._model._fields.filter(field => !['email', 'isVerified', 'role', 'creationAt'].includes(field)), [{
                field: 'id', operator: '=', value: null
            }])
            .removeDelete();

        this._accessPolicies.guest
            .removeAll();
    }

    /**
     * @param {e.Request} req
     * @param {e.Response} res
     * @param {e.NextFunction} next
     * @return {Promise<e.Response>}
     */
    async getAll(req, res, next) {
        try {
            const filters = [
                new Where('role', '=', 'user'),
                new Where('isVerified', '=', 1)
            ];

            const userModel = new UserModel();
            const entities = await userModel.getEntities(
                req?.accessOperation?.fields,
                filters
            );

            return this._returnResponse(res, 200, {
                data: entities.map(entity => entity.toJSON())
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @param {e.Request} req
     * @param {e.Response} res
     * @param {e.NextFunction} next
     * @return {Promise<e.Response>}
     */
    async create(req, res, next) {
        try {
            const validationErrors = [];
            let user = await this._model.getByEmail(req?.body?.email);

            if (user) {
                validationErrors.push({ path: 'email', msg: 'Email belongs to another user.' });
            }

            if (validationErrors.length > 0) {
                return this._returnResponse(res, 400, {
                    validationErrors, validationSuccesses: req.validationSuccesses
                }, "Validation failed.");
            }

            const fields = this._prepareFields(req);

            if (fields.password) {
                fields.password = await this._model.createPassword(fields.password);
            }

            if (fields.email) {
                fields.confirmToken = await this._model.createToken({ userEmail: fields.email });
            }

            const newUser = this._model.createEntity(fields);
            await newUser.save();

            await (new CalendarModel()).createMainCalendar(newUser.id);
            await (new CalendarModel()).addUserToHolidaysCalendar(newUser.id);

            req.confirmToken = newUser?.confirmToken;
            req.newUser = newUser.toJSON();

            return res.status(201).json({
                data: newUser.toJSON(),
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @param {e.Request} req
     * @param {e.Response} res
     * @param {e.NextFunction} next
     * @return {Promise<e.Response>}
     */
    async validateUpdate(req, res, next) {
        return await this.validateBody(req, res, next, this._validationRulesForUpdate);
    }

    /**
     * @param {e.Request} req
     * @param {e.Response} res
     * @param {e.NextFunction} next
     * @return {Promise<e.Response>}
     */
    async update(req, res, next) {
        if (req?.user?.role === 'user' && req?.accessOperation) {
            req.accessOperation.filter.forEach(item => {
                if (item.field === 'id') {
                    item.value = req.user.id
                }
            });
        }

        if (req?.body?.password) {
            req.body.password = await this._model.createPassword(req.body.password);
        }

        return super.update(req, res, next);
    }
}

export default UserController;