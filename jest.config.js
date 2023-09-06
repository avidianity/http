/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    automock: false,
    setupFilesAfterEnv: ['./jest.setup.js'],
};