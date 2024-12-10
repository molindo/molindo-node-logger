# Changelog

## 1.3.0

Don't add `variables` to `meta.graphql` in the middleware logger. It is possible
that `variables` is a big object that could bloat the payload.

## 1.2.0

Add handling for `requestId` ([#18](https://github.com/molindo/molindo-node-logger/pull/18))

## 1.1.1

Fix logging of GraphQL response in case of errors ([@symn](https://github.com/symn) in [#3](https://github.com/molindo/molindo-node-logger/pull/3)).
