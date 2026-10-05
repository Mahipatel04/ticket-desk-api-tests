# Ticket Desk API Regression Suite

An API testing project for the [Ticket Desk](https://github.com/Mahipatel04/Ticket-Desk) portfolio API. It includes an importable Postman collection and a dependency-free Node.js regression runner for CI.

## What it checks

- Valid login returns a JWT; invalid credentials return 401.
- Ticket listing and status filtering return the expected response shapes.
- Create, update, and delete workflows return the expected HTTP statuses.
- Dashboard counts contain the expected numeric fields.
- A ticket is absent after it has been deleted.

## Run it locally

Prerequisites: Node.js 20+, npm, and a running Ticket Desk API at `http://localhost:5080`.

1. Start SQL Server and the API by following the Ticket Desk README.
2. In this folder, run the suite: `npm test`.

The local Postman environment uses the demo account included in the Ticket Desk README. To target another API, edit `baseUrl`, `email`, and `password` in `postman/local.postman_environment.json`.

The Postman collection is in `postman/ticket-desk.postman_collection.json`. Import it and `postman/local.postman_environment.json` into Postman to inspect or run each request interactively.

## CI

The GitHub Actions workflow checks out this project and the public Ticket Desk API repository, starts SQL Server and the API, then runs the Node.js regression suite on pushes and pull requests.

## Portfolio notes

This suite validates the current demo API contract. It does not yet cover authentication roles, concurrency, data validation edge cases, or browser UI behavior. The account is a local demo credential; never reuse it for a deployed system.
