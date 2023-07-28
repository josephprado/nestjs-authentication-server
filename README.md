<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository for an authorization server.

**DISCLAIMER**:
I am not a security expert (took a computer security class in college, but that's about it). I will try to update this repository as I learn more about security best practices. I have linked some of the articles that I found most informative while putting this together at the bottom of this document.

## Setup

### Environments

See `env/readme.md` for instructions on setting up environment variables. The following environments are required to run the scripts in `package.json` (these can be renamed to anything, however, be sure to edit the package.json scripts to use your custom environment names):

- `dev-test` : All test scripts use this environment, as well as the GitHub workflow.
- `dev` : All start scripts (except `start:prod`) use this environment.

### ESLint

This project uses [ESLint](https://eslint.org/) to catch problems in the code. The settings are defined in `.eslintrc.js`.

### Prettier

This project uses [Prettier](https://prettier.io/) to automatically format code. The settings are defined in `.prettierrc`.

### GitHub

This repository is a template repository. You can create a new repository based on this one by clicking `Use this template > Create a new repository` at the top of the GitHub repository.

`.github/workflows/build-and-test.yml` contains a GitHub Actions workflow for automatically running tests when a pull request is opened. It creates a local postgreSQL database to run the tests. The workflow relies on an actions secret that you must define at `Settings > Security > Secrets and variables > Actions > New repository secret`. Name the secret `ENV_DEV_TEST`. See the `Environments` section above for setting up the properties in this secret. This is basically an env file stored on GitHub. The workflow will grab this secret and convert it into a file named `env/.env.dev-test` for use in the testing step.

## Modules

### AppModule

This is the root module that starts the application. The AppController provides basic information about the app. The following routes are available:

- `/` : Returns a 'Hello World!' message along with an HTTP status of 200 for verifying the app is running.
- `/env` : Returns what environment (e.g., test, prod, etc.) the app is currently running in.

### AuthModule

This module provides authentication and authorization services. The following routes are available:

- `/api/auth/signup` : Registers a new user in the database.
- `/api/auth/login` : If user is registered, returns an access token (for accessing protected resources) and a refresh token (for obtaining a new access token after it expires).
- `/api/auth/logout` : Invalidates the user's refresh token. The user will need to login to obtain new tokens.
- `/api/auth/refresh` : Refreshes the access and refresh tokens.

The signup, login, and refresh endpoints all return an access token in the response body and a refresh token in an HTTP only cookie. The expirations of each can be set in the env variables (see the `Environments` section above). Typically, the access token should have a short life (~15 minutes) while the refresh token is long-lived (7+ days).

The HTTP cookie with the refresh token has the following attributes:

- `HttpOnly` : Cookie is inaccessible to JavaScript Document.cookie API
- `Secure` : Browser only sends cookie on HTTPS requests (not HTTP)
- `Path=/api/auth/refresh` : Browser only sends cookie if this path is present in the URL
- `SameSite=Strict` : Browser only sends cookie with requests to the cookie's origin site (i.e., this server)

#### Token storage on the client

On the client side, upon receiving these tokens, precautions must be taken to ensure they are not compromised. Since the refresh token lives in an HTTP only cookie, it is not accessible to the client or JavaScript in general, so it is protected from cross-site scripting (XSS) attacks. However, it remains vulnerable to cross-site request forgery (XSRF), which can be mitigated by other measures (CORS policy, CSRF tokens, etc.). Based on my research, I have determined that the best place for the client to store the access token is in memory (just a regular variable in the code).

```typescript
const body = await fetch('http://localhost:8081/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'username',
    password: 'password'
  })
});
const { accessToken, expiresIn } = body.json();
```

The alternatives (local and session storage) are not secure. I have attached articles in the resources section at the bottom of this document with more info on the topic.

### LogModule

This module exports a custom LogService that can be used in other modules for application logging. By default, logging is turned off in the `dev-test` environment (the environment that all tests are run on). If you want to turn logging off in any other environment, add the property `LOGS=false` to the appropriate env file.

### Shared directory

This directory (not a module) contains files that are consumed/shared by the other modules.

## Abstract entities

### Base entity

The Base entity is an abstract entity containing properties that should apply to all entities, like `createDate` and `updateDate`. If there are other properties that should apply to all entities, add them to this class and have all entities extend from Base.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## References

- I referenced tutorials from [elvisduru.com](https://www.elvisduru.com/blog/nestjs-jwt-authentication-refresh-token) and [docs.nestjs.com](https://docs.nestjs.com/security/authentication) for creating the AuthModule
- Other useful articles:
  - https://mannharleen.github.io/2020-03-19-handling-jwt-securely-part-1/
  - https://indepth.dev/posts/1382/localstorage-vs-cookies
  - https://tkacz.pro/how-to-securely-store-jwt-tokens/
  - https://www.acunetix.com/websitesecurity/cross-site-scripting/
  - https://portswigger.net/web-security/csrf
