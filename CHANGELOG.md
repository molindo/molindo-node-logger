# Changelog

## 3.0.0

Limit the size of logged `variables` for `meta.graphql` in the middleware logger
via `maxGraphQLVariablesLength`. It's possible that `variables` is a big object that could bloat the payload.

### Breaking Changes
- The default length for `maxGraphQLVariablesLength` is `512`, which causes `meta.graphql.variables` to be truncated after `512` characters by default.

## 2.0.0

Update devDependencies and dependencies. Update to newest `winston` and
`express-winston`. Adapt to breaking changes. ([#20](https://github.com/molindo/molindo-node-logger/pull/20))

### Breaking Changes

- Supported Node.js version changed to >= 20.
- Removed `destroy()` from `Logger` class.

## 1.2.0

Add handling for `requestId` ([#18](https://github.com/molindo/molindo-node-logger/pull/18))

## 1.1.1

Fix logging of GraphQL response in case of errors
([@symn](https://github.com/symn) in
[#3](https://github.com/molindo/molindo-node-logger/pull/3)).
