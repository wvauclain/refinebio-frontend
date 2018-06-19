import { getQueryString, getQueryParamObject, Ajax } from './helpers';

describe('getQueryString', () => {
  it('with falsy values', () => {
    expect(getQueryString({ a: 1, b: undefined, c: false, d: 0 })).toBe(
      'a=1&c=false&d=0'
    );
  });

  it('encoding string', () => {
    expect(getQueryString({ a: '1 2' })).toBe('a=1%202');
  });
});

it('getQueryParamObject parses query', () => {
  expect(getQueryParamObject('a=0&b=false&c=1')).toEqual({
    a: '0',
    b: 'false',
    c: '1'
  });
});

describe('Ajax', () => {
  beforeEach(function() {
    global.fetch = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ok: true, json: () => {} }));
  });

  describe('get', () => {
    it('makes requests to url', () => {
      Ajax.get('/url');
      expect(global.fetch.mock.calls[0]).toEqual(['/url']);
    });

    it('sends parameters encoded in url', () => {
      Ajax.get('/url', { a: 1, b: 2 });
      expect(global.fetch.mock.calls[0]).toEqual(['/url?a=1&b=2']);
    });
  });

  describe('post', () => {
    it('sends requests with parameters', () => {
      Ajax.post('/url', { a: 1, b: 2 });
      expect(global.fetch.mock.calls[0]).toEqual([
        '/url',
        {
          body: '{"a":1,"b":2}',
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          }
        }
      ]);
    });
  });

  describe('put', () => {
    it('sends requests with parameters', () => {
      Ajax.put('/url', { a: 1, b: 2 });
      expect(global.fetch.mock.calls[0]).toEqual([
        '/url',
        {
          body: '{"a":1,"b":2}',
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          }
        }
      ]);
    });
  });
});