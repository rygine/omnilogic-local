# Contributing

Your questions, feedback, suggestions, and code contributions are welcome!

## 🐞 Issues

Report an issue on
[GitHub Issues](https://github.com/rygine/omnilogic-local/issues/new/choose).

## 🔀 Pull Requests

Pull requests are welcome. Before you open one, search the existing issues. You
can also open a feature request first.

A pull request needs an approval before it can merge.

### AI-Generated Contributions Policy

We do not accept pull requests that AI tools generated entirely or mostly. This
includes:

- Automated typo fixes or formatting changes
- Generic code improvements without context
- Mass automated updates or refactoring

If a pull request appears AI-generated without meaningful human oversight, it
will be closed without review. Every contribution should be human-driven and
thoughtful, and show an understanding of the codebase and project goals.

> [!CAUTION]
>
> To protect project quality and maintain contributor trust, we will restrict
> access for users who continue to submit AI-generated pull requests.

If you use AI tools while you develop, please:

1. Thoroughly review and understand all generated code
2. Write a detailed pull request description that explains your changes and your
   reasons
3. Be ready to discuss your implementation decisions and how they fit the
   project goals

## 🔧 Developing

### Prerequisites

#### Node

Use a Node version that matches `package.json` or `.node-version`.

#### Yarn

This repository uses the [Yarn package manager](https://yarnpkg.com/). If
[Corepack](https://yarnpkg.com/corepack) is not enabled, run `corepack enable`
so that you can use Yarn.

### Useful commands

- `yarn`: Install all dependencies
- `yarn build`: Build every package and app
- `yarn start`: Build the SDK, then run the web app in dev mode
- `yarn clean`: Remove all `node_modules`, `.turbo`, and build folders
- `yarn format`: Format with oxfmt and write the changes
- `yarn format:check`: Check formatting with oxfmt
- `yarn lint`: Lint with oxlint
- `yarn fix`: Lint with oxlint and apply fixes
- `yarn test`: Run the unit tests
- `yarn test:cov`: Run the unit tests with coverage
- `yarn typecheck`: Type-check with `tsc`
- `yarn ci`: Build, lint, check formatting, test, and type-check
- `yarn workspace @rygine/omnilogic-docs dev`: Run the documentation site
  locally

### Testing

Please add unit tests when appropriate. Before you open a pull request, make
sure that all unit tests pass.

## 🚢 Publishing

The project maintainer decides when to publish updates and publishes them
manually.
