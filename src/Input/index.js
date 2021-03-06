import React, {Component} from 'react'; // eslint-disable-line no-unused-vars
import shallowCompare from 'react-addons-shallow-compare';

import TextField from 'material-ui/TextField';

import classes from './styles.css'

import filterInputAttributes from '../settings/filter-input-attributes';

/**
 * The input field
 * @param {Object} props The component's props
 * @return {JSX} The icon component.
 */
class Input extends Component {
  /**
   * Whether or not the component should update
   * @param {Object} nextProps The new properties
   * @param {Object} nextState The new state
   * @return {Boolean} Update or not?
   */
  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  /**
   * When the input got changed
   */
  onChange = () => {
    this.props.onChange(this.input.value);
  };

  /**
   * When the input got focused
   */
  onFocus = () => {
    this.props.onFocus();
  };

  /**
   * When the input loses focus
   */
  onBlur = () => {
    this.props.onBlur();
  };

  /**
   * When a key gets pressed in the input
   * @param  {Event} event The keypress event
   */
  onKeyPress = event => {
    this.props.onKeyPress(event);
  };

  /**
   * When a key gets pressed in the input
   * @param  {Event} event The keydown event
   */
  onInputKeyDown = event => { // eslint-disable-line complexity
    // Call props.onKeyDown if defined
    // Gives the developer a little bit more control if needed
    if (this.props.onKeyDown) {
      this.props.onKeyDown(event);
    }

    switch (event.which) {
      case 40: // DOWN
        if (!event.shiftKey) {
          event.preventDefault();
          this.props.onNext();
        }
        break;
      case 38: // UP
        if (!event.shiftKey) {
          event.preventDefault();
          this.props.onPrev();
        }
        break;
      case 13: // ENTER
        if (this.props.ignoreEnter) {
          event.preventDefault();
        }

        this.props.onSelect();
        break;
      case 9: // TAB
        if (!this.props.ignoreTab) {
          this.props.onSelect();
        }
        break;
      case 27: // ESC
        this.props.onEscape();
        break;
      /* istanbul ignore next */
      default:
        break;
    }
  };

  /**
   * Focus the input
   */
  focus() {
    this.input.focus();
  }

  /**
   * Blur the input
   */
  blur() {
    this.input.blur();
  }

  /**
   * Render the view
   * @return {Function} The React element to render
   */
  render() {
    const attributes = filterInputAttributes(this.props)
  
    return <TextField className={classes.Input}
      id="geosuggest-material-ui"
      inputRef={(input) => { this.input = input }}
      type='text'
      label='Address'
      autoComplete='off'
      {...attributes}
      value={this.props.value}
      onKeyDown={this.onInputKeyDown}
      onChange={this.onChange}
      onKeyPress={this.onKeyPress}
      onFocus={this.onFocus}
      onBlur={this.onBlur} />;
  }
}

/**
 * Default values for the properties
 * @type {Object}
 */
Input.defaultProps = {
  className: '',
  value: '',
  ignoreTab: false,
  onKeyDown: () => {},
  onKeyPress: () => {},
  autoComplete: 'off'
};

export default Input;
