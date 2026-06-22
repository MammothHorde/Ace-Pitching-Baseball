const React = require('react');

// Lightweight stubs so SVG imports don't crash in the node test env
const stub = ({ children }) => React.createElement('svg-stub', null, children);

module.exports = {
  __esModule: true,
  default: stub,
  Svg: stub,
  Rect: stub,
  Circle: stub,
  Path: stub,
  G: stub,
  Line: stub,
  Polyline: stub,
  Polygon: stub,
  Text: stub,
  TSpan: stub,
  Defs: stub,
  ClipPath: stub,
  LinearGradient: stub,
  RadialGradient: stub,
  Stop: stub,
  Mask: stub,
  Use: stub,
};
