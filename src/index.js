import React, { Component } from 'react';
import classnames from 'classnames';
import debounce from 'lodash.debounce';
import { FormControl, FormHelperText } from 'material-ui/Form';
import { withStyles } from 'material-ui/styles';

import defaults from './settings/defaults';
import propTypes from './settings/prop-types';
import filterInputAttributes from './settings/filter-input-attributes';


import Input from './Input';
import SuggestList from './SuggestList';

import Wrapper from '../../../../hoc/Wrapper'

import css from './styles.css'

// Escapes special characters in user input for regex
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

const styles = theme => ({
  formControl: {
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit
  },
  labelStyle: {
    fontSize: '2rem'
  },
  withoutLabel: {
    marginTop: theme.spacing.unit * 3,
  },
});

/**
 * Entry point for the Geosuggest component
 */
class Geosuggest extends Component {
  state = {
    isSuggestsHidden: true,
    isLoading: false,
    userInput: '',
    activeSuggest: null,
    suggests: []
  }

  /**
   * The constructor. Sets the initial state.
   * @param  {Object} props The properties object.
   */
  constructor(props) {
    super(props);
  
    if (props.queryDelay) {
      this.onAfterInputChange = debounce(this.onAfterInputChange, props.queryDelay);
    }
  }

  /**
   * Change inputValue if prop changes
   * @param {Object} props The new props
   */
  componentWillReceiveProps (props) {
    if (this.props.initialValue !== props.initialValue) {
      this.setState({ userInput: props.initialValue })
    }
  }

  /**
   * Called on the client side after component is mounted.
   * Google api sdk object will be obtained and cached as a instance property.
   * Necessary objects of google api will also be determined and saved.
   */
  componentWillMount() {
    if (typeof window === 'undefined') {
      return;
    }

    var googleMaps = this.props.googleMaps ||
      (window.google && // eslint-disable-line no-extra-parens
        window.google.maps) ||
      this.googleMaps;

    /* istanbul ignore next */
    if (!googleMaps) {
      if (console) {
        console.error(// eslint-disable-line no-console
          'Google map api was not found in the page.');
      }
      return;
    }
    this.googleMaps = googleMaps;

    this.autocompleteService = new googleMaps.places.AutocompleteService();
    this.geocoder = new googleMaps.Geocoder();
  }

  /**
   * When the component will unmount
   */
  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  /**
   * When the input changed
   * @param {String} userInput The input value of the user
   */
  onInputChange = userInput => {
    if (!userInput) {
      this.props.onSuggestSelect();
    }
    this.setState({userInput}, this.onAfterInputChange);
  };

  /**
   * On After the input got changed
   */
  onAfterInputChange = () => {
    this.showSuggests()
    this.props.onChange(this.state.userInput)
  };

  /**
   * When the input gets focused
   */
  onInputFocus = () => {
    this.props.onFocus();
    this.showSuggests();
  };

  /**
   * When the input gets blurred
   */
  onInputBlur = () => {
    if (!this.state.ignoreBlur) {
      this.hideSuggests();
    }
  };

  onNext = () => this.activateSuggest('next');

  onPrev = () => this.activateSuggest('prev');

  onSelect = () => {
    this.selectSuggest(this.state.activeSuggest)
  }

  onSuggestMouseDown = () => this.setState({ignoreBlur: true});

  onSuggestMouseOut = () => this.setState({ignoreBlur: false});

  onSuggestNoResults = () => {
    this.props.onSuggestNoResults(this.state.userInput);
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
   * Update the value of the user input
   * @param {String} userInput the new value of the user input
   */
  update(userInput) {
    this.setState({userInput});
  }

  /*
   * Clear the input and close the suggestion pane
   */
  clear() {
    
    this.setState({userInput: ''}, this.hideSuggests)
    // this.props.onChange()
  }

  /**
   * Search for new suggests
   */
  searchSuggests = () => {
    if (!this.state.userInput) {
      this.updateSuggests();
      return;
    }

    const options = {
        input: this.state.userInput
      },
      inputLength = this.state.userInput.length,
      isShorterThanMinLength = inputLength < this.props.minLength;

    if (isShorterThanMinLength) {
      return;
    }

    ['location', 'radius', 'bounds', 'types'].forEach(option => {
      if (this.props[option]) {
        options[option] = this.props[option];
      }
    });

    if (this.props.country) {
      options.componentRestrictions = {
        country: this.props.country
      };
    }

    this.setState({isLoading: true}, () => {
      this.autocompleteService.getPlacePredictions(
        options,
        suggestsGoogle => {
          this.setState({isLoading: false});
          this.updateSuggests(suggestsGoogle || [], // can be null
            () => {
              if (this.props.autoActivateFirstSuggest &&
                !this.state.activeSuggest
              ) {
                this.activateSuggest('next');
              }
            })
        }
      )
    })
  }

  /**
   * Update the suggests
   * @param {Array} suggestsGoogle The new google suggests
   * @param {Function} callback Called once the state has been updated
   */
  updateSuggests = (suggestsGoogle = [], callback) => {
    const suggests = []
    const userInput = this.state.userInput
    const regex = new RegExp(escapeRegExp(userInput), 'gim')
    const skipSuggest = this.props.skipSuggest
    const maxFixtures = this.props.maxFixtures
    let fixturesSearched = 0
    let activeSuggest = null

    this.props.fixtures.forEach(suggest => {
      if (fixturesSearched >= maxFixtures) {
        return
      }

      if (!skipSuggest(suggest) && suggest.label.match(regex)) {
        fixturesSearched++

        suggest.placeId = suggest.label
        suggest.isFixture = true
        suggest.matchedSubstrings = {
          offset: suggest.label.indexOf(userInput),
          length: userInput.length
        };
        suggests.push(suggest);
      }
    });

    suggestsGoogle.forEach(suggest => {
      if (!skipSuggest(suggest)) {
        suggests.push({
          description: suggest.description,
          label: this.props.getSuggestLabel(suggest),
          placeId: suggest.place_id,
          isFixture: false,
          matchedSubstrings: suggest.matched_substrings[0]
        });
      }
    });

    activeSuggest = this.updateActiveSuggest(suggests);
    this.setState({suggests, activeSuggest}, callback);
  }

  /**
   * Return the new activeSuggest object after suggests have been updated
   * @param {Array} suggests The new list of suggests
   * @return {Object} The new activeSuggest
   **/
  updateActiveSuggest = (suggests = []) => {
    let activeSuggest = this.state.activeSuggest;

    if (activeSuggest) {
      const newSuggest = suggests.filter(listedSuggest =>
        activeSuggest.placeId === listedSuggest.placeId &&
        activeSuggest.isFixture === listedSuggest.isFixture
      )[0];

      activeSuggest = newSuggest || null;
    }

    return activeSuggest;
  }

  /**
   * Show the suggestions
   */
  showSuggests = () => {
    this.searchSuggests();
    this.setState({isSuggestsHidden: false});
  }

  /**
   * Hide the suggestions
   */
  hideSuggests = () => {
    this.props.onBlur(this.state.userInput);
    this.timer = setTimeout(() => {
      this.setState({
        isSuggestsHidden: true,
        activeSuggest: null
      });
    }, 100);
  };

  /**
   * Activate a new suggest
   * @param {String} direction The direction in which to activate new suggest
   */
  activateSuggest(direction) { // eslint-disable-line complexity
    if (this.state.isSuggestsHidden) {
      this.showSuggests();
      return;
    }

    const suggestsCount = this.state.suggests.length - 1,
      next = direction === 'next';
    let newActiveSuggest = null,
      newIndex = 0,
      i = 0;

    for (i; i <= suggestsCount; i++) {
      if (this.state.suggests[i] === this.state.activeSuggest) {
        newIndex = next ? i + 1 : i - 1;
      }
    }

    if (!this.state.activeSuggest) {
      newIndex = next ? 0 : suggestsCount;
    }

    if (newIndex >= 0 && newIndex <= suggestsCount) {
      newActiveSuggest = this.state.suggests[newIndex];
    }

    this.props.onActivateSuggest(newActiveSuggest);

    this.setState({activeSuggest: newActiveSuggest});
  }

  /**
   * When an item got selected
   * @param {GeosuggestItem} suggest The selected suggest item
   */
  selectSuggest = suggest => {
    if (!suggest) {
      suggest = {
        label: this.state.userInput
      };
    }

    this.setState({
      isSuggestsHidden: true,
      userInput: typeof suggest.label !== 'object' ? suggest.label : suggest.description
    })

    if (suggest.location) {
      this.setState({ignoreBlur: false})
      this.props.onSuggestSelect(suggest)
      return
    }

    this.geocodeSuggest(suggest)
  }

  /**
   * Geocode a suggest
   * @param  {Object} suggest The suggest
   */
  geocodeSuggest(suggest) {
    let options = null;
    if (suggest.placeId && !suggest.isFixture) {
      options = {
        placeId: suggest.placeId
      };
    } else {
      options = {
        address: suggest.label,
        location: this.props.location,
        bounds: this.props.bounds,
        componentRestrictions: this.props.country ?
        {country: this.props.country} : null
      };
    }
    this.geocoder.geocode(
      options,
      (results, status) => {
        if (status === this.googleMaps.GeocoderStatus.OK) {
          const gmaps = results[0]
          const location = gmaps.geometry.location

          suggest.gmaps = gmaps
          suggest.location = {
            lat: location.lat(),
            lng: location.lng()
          };
        }
        this.props.onSuggestSelect(suggest)
        
        const comps = suggest.gmaps.address_components
        const address = {}

        for (let i in comps) {
          if (comps[i].types.indexOf('street_number') !== -1) address.street_number = comps[i].short_name
          if (comps[i].types.indexOf('route') !== -1) address.street = comps[i].short_name
          if (comps[i].types.indexOf('locality') !== -1) address.city = comps[i].short_name
          if (comps[i].types.indexOf('administrative_area_level_1') !== -1) address.state = comps[i].short_name
          if (comps[i].types.indexOf('country') !== -1) address.country = comps[i].short_name
          if (comps[i].types.indexOf('postal_code') !== -1) address.postal_code = comps[i].short_name
        }
        address.value = suggest.gmaps.formatted_address


        // make the desired object from the gmaps data
        
        this.props.input.onChange(address)
      }
    );
  }

  /**
   * Render the view
   * @return {Function} The React element to render
   */
  render() {
    const { input } = this.props;
    const fullWidth = (this.props.fullWidth) ? true : false

    const attributes = filterInputAttributes(this.props)
    
    const classes = classnames(
        css.GeoSuggest,
        {[css.GeoSuggestLoading]: this.state.isLoading}
      )
    const shouldRenderLabel = this.props.label && attributes.id
    const textInput = <Input className={this.props.inputClassName}
        ref={i => this.input = i}
        value={this.state.userInput} 
        ignoreEnter={!this.state.isSuggestsHidden}
        ignoreTab={this.props.ignoreTab}
        onChange={this.onInputChange}
        onFocus={this.onInputFocus}
        onBlur={this.onInputBlur}
        onKeyDown={this.props.onKeyDown}
        onKeyPress={this.props.onKeyPress}
        onNext={this.onNext}
        onPrev={this.onPrev}
        onSelect={this.onSelect}
        onEscape={this.hideSuggests} {...attributes} />

      const suggestionsList = <SuggestList isHidden={this.state.isSuggestsHidden}
        userInput={this.state.userInput}
        isHighlightMatch={this.props.highlightMatch}
        suggests={this.state.suggests}
        activeSuggest={this.state.activeSuggest}
        onSuggestNoResults={this.onSuggestNoResults}
        onSuggestMouseDown={this.onSuggestMouseDown}
        onSuggestMouseOut={this.onSuggestMouseOut}
        onSuggestSelect={this.selectSuggest}
        renderSuggestItem={this.props.renderSuggestItem}
        minLength={this.props.minLength} />

    return <Wrapper>
      <FormControl className={classes.formControl} fullWidth={fullWidth}>
        {textInput}
        {suggestionsList}
      </FormControl>
    </Wrapper>;
  }
}

/**
 * Types for the properties
 * @type {Object}
 */
Geosuggest.propTypes = propTypes;

/**
 * Default values for the properties
 * @type {Object}
 */
Geosuggest.defaultProps = defaults;

export default withStyles(styles)(Geosuggest)
