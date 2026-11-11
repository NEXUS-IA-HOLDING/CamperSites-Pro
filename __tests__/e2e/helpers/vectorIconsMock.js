/**
 * Mock for react-native-vector-icons
 */
const React = require('react');
const { Text } = require('react-native');

const createIconSet = () => {
  const IconComponent = (props) => {
    return React.createElement(
      Text,
      {
        testID: props.testID || `icon-${props.name}`,
        accessibilityLabel: props.name,
        style: props.style,
      },
      props.name
    );
  };
  IconComponent.hasIcon = () => true;
  IconComponent.loadFont = () => Promise.resolve();
  IconComponent.getImageSource = () => Promise.resolve({});
  IconComponent.getImageSourceSync = () => ({});
  return IconComponent;
};

const Icon = createIconSet();
Icon.createIconSet = createIconSet;
Icon.Button = (props) => React.createElement(Text, props, props.title || props.name);

module.exports = Icon;
module.exports.default = Icon;
