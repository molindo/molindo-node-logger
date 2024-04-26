/**
 * Stringifies a Javascript object and returns key=value pairs separated by comma.
 * @param {Object} obj
 * @return String
 */

export default function stringifyObject(obj) {
  const output = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && Object.keys(value).length > 0) {
      if (Array.isArray(value)) {
        output.push(`${key}=[${value.map(stringifyValue).join(', ')}]`);
      } else {
        output.push(stringifyObject(value));
      }
    } else {
      output.push(`${key}=${stringifyValue(value)}`);
    }
  }

  return output.join(', ');
}

function stringifyValue(value) {
  if (value === null) {
    return 'null';
  } else if (value === undefined) {
    return 'undefined';
  } else if (typeof value === 'function') {
    return value.toString();
  } else if (Array.isArray(value)) {
    return `[${value.map(stringifyValue).join(', ')}]`;
  } else if (typeof value === 'object') {
    if (JSON.stringify(value) === '{}') {
      return '[]';
    }
    return stringifyObject(value);
  } else {
    return value;
  }
}
