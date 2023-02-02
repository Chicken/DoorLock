# DoorLock

Electronic door lock system for home automation. Besides the basic functionality (reading key a key fob and opening the door) this project introduces the need for pin codes during a set night time and offers a web interface for managing keys and viewing logs.

Receives key fob readings and pin codes as strings of numbers seperate by newline via serialport. Opens the door by powering a GPIO pin. Runs on a [Raspberry Pi Zero W](https://www.raspberrypi.com/products/raspberry-pi-zero-w/).

This turned from a random project in to a portfolio tier skill show off using as much new and fancy tech as possible. Aims the be very typesafe. The project currently has two parts.

The backend for which [Deno](https://deno.land/) was a considered runtime but my knowledge and trust in [Node](https://nodejs.org/) was considerably higher so it ended up being the winner. For I/O operations the libraries [`serialport`](https://serialport.io/) and [`onoff`](https://npmjs.com/package/onoff) are used. To be TypeSafe with the database operations I chose to use the [Prisma ORM](https://www.prisma.io/). I've been recently hearing a lot about [tRPC](https://trpc.io/) so I really wanted to use it for the API as it guarantees typesafety between the server and client using [Zod](https://zod.dev/), the library that goes where TypeScript doesn't, validating user input during runtime. Only the login router is a basic REST endpoint using [Express](https://expressjs.com/) to be able to use cookie based session token authentication. The tRPC API also uses a websocket handler for subscriptions to be able to stream new logs to the frontend.

The frontend which would have been a great show of my [React](https://reactjs.org/) skills but I ended up choosing between two new pieces of technology: [Svelte](https://svelte.dev/) and [SolidJS](https://www.solidjs.com/). Solid won as it feels more closer to React and I've heard some friends talk about it. To accompany Solid I needed [Solid Router](https://www.npmjs.com/package/@solidjs/router) and [Solid tRPC](https://www.npmjs.com/package/solid-trpc). To save myself from writing CSS but still have full control over styling, the frontend needed [Tailwind](https://tailwindcss.com/). And with [Vite](https://vitejs.dev/) I'm able to move between iterations at the speed of light.

Both of which are contained in this monorepo which uses amazing tools such as [Yarn v3](https://yarnpkg.com/), [Turborepo](https://turbo.build/repo), [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/). As a DevOps enthusiastic I had to have CI/CD using [GitHub actions](https://docs.github.com/en/actions). And for deployment we have [Docker](https://www.docker.com/), so if it runs on my machine, it _will_ run on your machine.

## Development

Use yarn and provided scripts

-   To install dependencies `yarn`
-   To format code `yarn format`
-   To lint code `yarn lint`
-   To build and run `yarn dev`

### Environmental variables

Copy `server/.env.example` to `server/.env` and add these values

| Key                     | Value                             |
| ----------------------- | --------------------------------- |
| `NODE_ENV`              | `development`                     |
| `MOCK_CONTROL_PORT`     | Port for mock http control server |
| `MOCK_CONTROL_PASSWORD` | Password for mock control         |

These will enable debug logs and mock the I/O so you don't need the actual hardware.

### Database

Start PostgreSQL in Docker

```bash
docker run --rm -d --name postgres -p 5432:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=password -e POSTGRES_DB=some_db postgres
```

Generate the Prisma client and sync the database with `yarn workspace server prisma migrate dev`
For more, refer to the [Prisma docs](https://www.prisma.io/docs).

### Usage

#### Mock control

Use the provided `./mock_input.sh` script, provide it a number as an argument.

## Production

### Docker

#### Backend

Needs environmental variables from [`server/.env.example`](./server/.env.example) which you can configure to your liking.

Needs a [PostgreSQL](https://www.postgresql.org/) database instance. A valid [connection url](https://www.prisma.io/docs/concepts/database-connectors/postgresql#connection-url) needs to be used for the `DATABASE_URL` environmental variable.

For access to hardware the container needs to be privileged **or** the devices can be passed manually. The serial device can be passed to the container via the [`--device` flag](https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities) or `docker-compose.yml` [`devices` field](https://docs.docker.com/compose/compose-file/compose-file-v3/#devices). And the GPIO pins can be added by mounting the entire `/sys` directory inside the container.

#### Frontend

The frontend is a simple container which just serves the SPA. It doesn't come with any HTTPS support nor proxying capability, yet the frontend will try to call the API paths `/api/trpc` and `/api/trpc_ws` both which will need to be proxied by an external reverse proxy such as Nginx to the corresponding ports in the backend container.
