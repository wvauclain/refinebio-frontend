import moment from 'moment';
import zip from 'lodash/zip';

// chart selectors for creating chart data for individual charts on dashboard
const JOB_NAMES = ['survey_jobs', 'downloader_jobs', 'processor_jobs'];
const JOB_STATUS = ['open', 'pending', 'completed'];

const formatTimeLabel = (date, range) => {
  const format =
    {
      day: 'HH:00',
      week: 'dddd',
      month: 'MMM Do',
      year: 'MMMM'
    }[range] || null;
  return moment(date).format(format);
};

export function getTotalLengthOfQueuesByType(stats) {
  const { survey_jobs, downloader_jobs, processor_jobs } = stats;

  return [
    {
      name: 'Survey',
      value: survey_jobs.open + survey_jobs.pending
    },
    {
      name: 'Downloader',
      value: downloader_jobs.open + downloader_jobs.pending
    },
    {
      name: 'Processor',
      value: processor_jobs.open + processor_jobs.pending
    }
  ];
}

export function getJobsByStatus(stats) {
  return JOB_NAMES.reduce((accum, jobType) => {
    accum[jobType] = JOB_STATUS.map(status => ({
      name: status,
      value: stats[jobType][status]
    }));
    return accum;
  }, {});
}

function convertSecToMinHours(sec) {
  const hours = Math.floor(sec / 3600),
    minutes = Math.round((sec % 3600) / 60);
  if (isNaN(hours) || isNaN(minutes)) {
    return `N/A`;
  } else {
    return `${hours} hr ${minutes} min`;
  }
}

export function getAllAverageTimeTilCompletion(stats) {
  return JOB_NAMES.reduce((allEstimatedTimes, jobType) => {
    const averageTime = parseFloat(stats[jobType].average_time);
    // we're assuming that average_time is in seconds...
    allEstimatedTimes[jobType] = convertSecToMinHours(averageTime);
    return allEstimatedTimes;
  }, {});
}

export function getAllEstimatedTimeTilCompletion(stats) {
  return JOB_NAMES.reduce((allEstimatedTimes, jobType) => {
    const estimateSec =
      (stats[jobType].open + stats[jobType].pending) *
      parseFloat(stats[jobType].average_time);

    // we're assuming that average_time is in seconds...
    allEstimatedTimes[jobType] = convertSecToMinHours(estimateSec);
    return allEstimatedTimes;
  }, {});
}

export function getExperimentsCount(stats) {
  return stats.experiments.total;
}

export function getSamplesCount(stats) {
  return stats.processed_samples.total;
}

/**
 * Build an array of datapoints with a date property and the total of all jobs
 * run up to that point in time since the beginning of that time range for each
 * job type
 */
export function getJobsCompletedOverTime(stats, range) {
  const surveyTimeline = transformTimeline(stats.survey_jobs.timeline, range);
  const downloaderTimeline = transformTimeline(
    stats.downloader_jobs.timeline,
    range
  );
  const processorTimeline = transformTimeline(
    stats.processor_jobs.timeline,
    range
  );

  return zip(surveyTimeline, downloaderTimeline, processorTimeline).map(
    ([
      { date, total: survey },
      { total: downloader },
      { total: processor }
    ]) => ({
      date,
      survey,
      downloader,
      processor
    })
  );
}

export function getDatasetsOverTime(stats, range) {
  return transformTimeline(stats.dataset.timeline, range);
}

export function getVolumeOfDataOverTime(stats, range) {
  return transformTimeline(stats.dataset.timeline, range, ['total_size']);
}

export function getExperimentsCreatedOverTime(stats, range) {
  return transformTimeline(stats.experiments.timeline, range).map(
    ({ date, total }) => ({
      date: date,
      experiments: total
    })
  );
}

export function getSamplesOverTime(stats, range) {
  const samplesTimeline = transformTimeline(
    stats.unprocessed_samples.timeline,
    range
  );
  const processedSamplesTimeline = transformTimeline(
    stats.processed_samples.timeline,
    range
  );
  return zip(samplesTimeline, processedSamplesTimeline).map(
    ([
      { date, total: totalSamplesUnprocessed },
      { total: totalSamplesProcessed }
    ]) => ({
      date: date,
      unprocessed: totalSamplesUnprocessed,
      processed: totalSamplesProcessed
    })
  );
}

export function getJobsByStatusOverTime(jobsTimeline, range) {
  return transformTimeline(jobsTimeline, range, [
    'pending',
    'open',
    'completed',
    'failed'
  ]);
}

/**
 * Returns a timeline that is sorted chronologically, and that has all datapoints
 * for a given `range`.
 * The `/stats` endpoint only returns the datapoints that have some value.
 * @param {*} timeline as returned by the /stats endpoint
 * @param {*} range range param that the graph will be displaying
 */
function transformTimeline(timeline, range, fields = ['total']) {
  const result = [...getTimeline(range)].map(date => {
    const result = {
      date
    };
    for (let field of fields) {
      result[field] = 0;
    }
    return result;
  });

  for (let observation of timeline) {
    let observationDate = observation.start;
    // find the closest datapoint to `data.start`
    let closestTemp = null;
    for (let graphPoint of result) {
      if (
        !closestTemp ||
        Math.abs(moment(observationDate).diff(graphPoint.date)) <
          Math.abs(moment(observationDate).diff(closestTemp.date))
      ) {
        closestTemp = graphPoint;
      }
    }
    if (closestTemp) {
      // add the total samples to that datapoint
      for (let field of fields) {
        closestTemp[field] = observation[field];
      }
    }
  }

  return result.map(({ date, ...rest }) => ({
    ...rest,
    date: formatTimeLabel(date, range)
  }));
}

/**
 * Given a range returns the
 * @param {*} range day/ | week | month | year
 */
function* getTimeline(range) {
  let now = moment.utc();
  if (range === 'day') {
    // remove last hour when viewing daily stats
    now = now.startOf('hour').subtract(1, 'hour');
  }

  const data = {
    day: {
      start: now.clone().subtract(1, 'days'),
      interval: moment.duration(1, 'hour')
    },
    week: {
      start: now
        .clone()
        .subtract(6, 'days')
        .startOf('day'),
      interval: moment.duration(1, 'days')
    },
    month: {
      start: now
        .clone()
        .subtract(30, 'days')
        .startOf('day'),
      interval: moment.duration(1, 'days')
    },
    year: {
      start: now
        .clone()
        .subtract(365, 'days')
        .startOf('month'),
      interval: moment.duration(1, 'months')
    }
  };
  let nextDate = data[range].start;
  let interval = data[range].interval;
  yield nextDate.format();

  while (true) {
    nextDate = nextDate.add(interval);
    if (nextDate.isAfter(now)) {
      break;
    }
    yield nextDate.format();
  }
}
