import React, { Component } from 'react';
import { connect } from 'react-redux';
import * as resultsActions from '../../state/search/actions';
import * as downloadActions from '../../state/download/actions';
import Helmet from 'react-helmet';
import Result from './Result';
import ResultFilters from './ResultFilters';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import BackToTop from '../../components/BackToTop';
import { getQueryParamObject } from '../../common/helpers';
import './Results.scss';
import { updateResultsPerPage } from '../../state/search/actions';
import Dropdown from '../../components/Dropdown';
import { PAGE_SIZES } from '../../constants/table';
import StartSearchingImage from '../../common/images/start-searching.svg';
import GhostSampleImage from '../../common/images/ghost-sample.svg';
import { Link } from 'react-router-dom';
import DataSetSampleActions from '../Experiment/DataSetSampleActions';
import isEqual from 'lodash/isEqual';

class Results extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: !props.results,
      query: '',
      filters: {}
    };
  }

  componentDidMount() {
    this.updateResults();
  }

  async componentDidUpdate(prevProps) {
    if (prevProps.location.search !== this.props.location.search) {
      // trigger a new search whenever the url changes, to ensure the results and the url
      // are in sync
      await this.updateResults();

      // reset scroll position when the results change
      window.scrollTo(0, 0);
    }
  }

  /**
   * Reads the search query and other parameters from the url and submits a new request to update the results.
   */
  async updateResults() {
    const { location } = this.props;
    let { q: query, p: page, size, ...filters } = getQueryParamObject(
      location.search
    );

    // for consistency, ensure all values in filters are arrays
    // the method `getQueryParamObject` will return a single value for parameters that only
    // appear once in the url
    for (let key of Object.keys(filters)) {
      if (!Array.isArray(filters[key])) {
        filters[key] = [filters[key]];
      }
    }

    // parse parameters from url
    query = decodeURIComponent(query);
    page = parseInt(page || 1, 10);
    size = parseInt(size || 10, 10);

    this.setState({ query, filters });

    // Check if we already have these results fetched, in which case we don't need to make an additional request
    // this can only happen when the component is initially mounted.
    if (
      this.props.results &&
      this.props.results.length > 0 &&
      query === this.props.searchTerm &&
      isEqual(filters, this.props.appliedFilters)
    ) {
      return;
    }

    this.setState({ isLoading: true });
    await this.props.fetchResults({ query, page, size, filters });
    this.setState({ isLoading: false });
  }

  handleSubmit = values => {
    // When a new search is made, return to the first page and clear the filters
    this.props.triggerSearch(values.search);
  };

  handlePageRemove = () => {
    const { removeExperiment, results } = this.props;
    const accessionCodes = results.map(result => result.accession_code);
    removeExperiment(accessionCodes);
  };

  render() {
    const searchTerm = this.state.query;
    const {
      results,
      addExperiment,
      removeExperiment,
      isLoading,
      pagination: { totalPages, currentPage }
    } = this.props;

    const samplesAsDataSet = results.reduce((data, result) => {
      data[result.accession_code] = result.processed_samples.map(
        accession_code => ({
          accession_code,
          is_processed: true
        })
      );
      return data;
    }, {});

    return (
      <div className="results">
        <Helmet>
          <title>refine.bio - Results</title>
        </Helmet>

        <BackToTop />
        <div className="results__search">
          <SearchInput onSubmit={this.handleSubmit} searchTerm={searchTerm} />
        </div>

        {isLoading || this.state.isLoading ? (
          <div className="loader" />
        ) : !results.length ? (
          <EmptyStates searchTerm={searchTerm} />
        ) : (
          <div className="results__container">
            <div className="results__top-bar">
              {results.length ? (
                <div className="results__number-results">
                  <NumberOfResults />
                </div>
              ) : null}

              <DataSetSampleActions
                data={samplesAsDataSet}
                enableAddRemaining={false}
                meta={{
                  buttonStyle: 'secondary',
                  addText: 'Add Page to Dataset'
                }}
              />
            </div>
            <div className="results__filters">
              <ResultFilters appliedFilters={this.state.filters} />
            </div>
            <div className="results__list">
              {results.map((result, i) => (
                <Result
                  key={i}
                  result={result}
                  addExperiment={addExperiment}
                  removeExperiment={removeExperiment}
                />
              ))}
              <Pagination
                onPaginate={this.props.updatePage}
                totalPages={totalPages}
                currentPage={currentPage}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
}
Results = connect(
  ({
    search: {
      results,
      filters,
      pagination,
      searchTerm,
      isSearching,
      appliedFilters
    },
    download: { dataSet }
  }) => ({
    results,
    pagination,
    searchTerm,
    dataSet,
    isLoading: isSearching,
    appliedFilters
  }),
  {
    ...resultsActions,
    ...downloadActions
  }
)(Results);

export default Results;

let NumberOfResults = ({
  resultsPerPage,
  totalResults,
  updateResultsPerPage
}) =>
  // Only show the dropdown if there're enough elements
  totalResults < PAGE_SIZES[0] ? (
    <div>
      Showing {totalResults} of {totalResults} results
    </div>
  ) : (
    <div>
      Showing{' '}
      <Dropdown
        options={PAGE_SIZES}
        selectedOption={resultsPerPage}
        onChange={updateResultsPerPage}
      />{' '}
      of {totalResults} results
    </div>
  );
NumberOfResults = connect(
  ({
    search: {
      pagination: { totalResults, resultsPerPage }
    }
  }) => ({
    totalResults,
    resultsPerPage
  }),
  { updateResultsPerPage }
)(NumberOfResults);

const EmptyStates = ({ searchTerm, appliedFilters }) => {
  const title = !!searchTerm ? 'No matching results' : 'Try searching for';
  const imageSrc = !!searchTerm ? GhostSampleImage : StartSearchingImage;
  const imageAlt = !!searchTerm ? 'No matching results' : 'Start searching';

  return (
    <div className="results__no-results">
      <h2>{title}</h2>
      {!!searchTerm ? (
        !!appliedFilters ? (
          <h3>
            Try another term or{' '}
            <Link className="link" to={`/results?q=${searchTerm}`}>
              Clear Filters
            </Link>
          </h3>
        ) : (
          <h3>Try another term</h3>
        )
      ) : (
        <div className="results__suggestions">
          <Link className="link results__suggestion" to="/results?q=Notch">
            Notch
          </Link>
          <Link
            className="link results__suggestion"
            to="/results?q=medulloblastoma"
          >
            Medulloblastoma
          </Link>
          <Link className="link results__suggestion" to="/results?q=GSE16476">
            GSE16476
          </Link>
        </div>
      )}
      <img
        src={imageSrc}
        alt={imageAlt}
        className="results__no-results-image"
      />
    </div>
  );
};
