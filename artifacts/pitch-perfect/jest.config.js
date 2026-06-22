/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // Path alias used throughout the app
    '^@/(.*)$': '<rootDir>/$1',
    // Stub react-native-svg so SVG components don't crash in the Node env
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
  },
  setupFiles: ['<rootDir>/__mocks__/setup.js'],
};
