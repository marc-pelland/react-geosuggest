import React, { Component } from 'react';
import classnames from 'classnames';
import { ListItem } from 'material-ui/List'

import styles from './styles.css'

/**
 * A single Geosuggest item in the list
 * @param {Object} props The component's props
 * @return {JSX} The icon component.
 */
export default class SuggestItem extends Component {
  /**
   * Makes a text bold
   * @param {String} element The element to wrap
   * @param {String} key The key to set on the element
   * @return {JSX} Bolder text
   */
  makeBold(element, key) {
    return <b className='geosuggest__item__matched-text' key={key}>
      {element}
    </b>;
  }

  /**
   * Replace matched text with the same bold
   * @param {Object} userInput Value from input
   * @param {Object} suggest Data from google
   * @return {String} Formatted string with highlighted matched text
   */
  formatMatchedText(userInput, suggest) {
    if (!userInput || !suggest.matchedSubstrings) {
      return suggest.label;
    }

    const start = suggest.matchedSubstrings.offset,
      length = suggest.matchedSubstrings.length,
      end = start + length,
      boldPart = this.makeBold(suggest.label.substring(start, end),
        suggest.label);

    let pre = '',
      post = '';

    if (start > 0) {
      pre = suggest.label.slice(0, start);
    }
    if (end < suggest.label.length) {
      post = suggest.label.slice(end);
    }

    return <span>{pre}{boldPart}{post}</span>;
  }

  /**
   * Checking if item just became active and scrolling if needed.
   * @param {Object} nextProps The new properties
   */
  componentWillReceiveProps(nextProps) {
    if (nextProps.isActive && !this.props.isActive) {
      this.scrollIfNeeded();
    }
  }

  /**
   * Scrolling current item to the center of the list if item needs scrolling.
   * Item is scrolled to the center of the list.
   */
  scrollIfNeeded = () => {
    
    return
    const el = this.ref
    const parent = el.parentElement
    const overTop = el.offsetTop - parent.offsetTop < parent.scrollTop
    const overBottom = el.offsetTop - parent.offsetTop + el.clientHeight > parent.scrollTop + parent.clientHeight

    if (overTop || overBottom) {
      parent.scrollTop = el.offsetTop - parent.offsetTop - parent.clientHeight / 2 + el.clientHeight / 2;
    }
  }

  /**
   * When the suggest item got clicked
   * @param {Event} event The click event
   */
  onClick = event => {
    event.preventDefault();
    this.props.onSelect(this.props.suggest);
  };

  /**
   * Render the view
   * @return {Function} The React element to render
   */
  render() {
    const {suggest} = this.props,
      classes = classnames(
        styles.SuggestItem,
        this.props.className,
        {[styles.SuggestItemActive]: this.props.isActive},
        {[this.props.activeClassname]: this.props.activeClassname ?
          this.props.isActive : null}
      );
    let content = suggest.label;

    if (this.props.renderSuggestItem) {
      content = this.props.renderSuggestItem(suggest);
    } else if (this.props.isHighlightMatch) {
      content = this.formatMatchedText(this.props.userInput, suggest);
    }

    return <ListItem className={classes}
      ref={item => this.ref = item}
      style={this.props.style}
      onMouseDown={this.props.onMouseDown}
      onMouseOut={this.props.onMouseOut}
      onClick={this.onClick}>
      {content}
    </ListItem>;
  }
}

/**
 * Default values for the properties
 * @type {Object}
 */
SuggestItem.defaultProps = {
  isActive: false,
  className: '',
  suggest: {}
};
