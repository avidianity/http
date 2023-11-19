/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    automock: false,
    setupFilesAfterEnv: ['./jest.setup.js'],
};
