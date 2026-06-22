/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // Path alias used throughout the app
    '^@/(.*)$': '<rootDir>/$1',
    // Stub react-native-svg so SVG components don't crash in the Node env
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
    // Static assets (images, fonts) resolve to a plain string
    '\\.(png|jpg|jpeg|gif|webp|svg|ttf|otf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFiles: ['<rootDir>/__mocks__/setup.js'],
};
