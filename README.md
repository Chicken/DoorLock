# DoorLock

Electronic door lock system for home automation. Besides the basic functionality (reading key a key fob and opening the door) this project introduces the need for pin codes during a set night time and offers a web interface for managing keys and viewing logs.

Receives key fob readings and pin codes as strings of numbers seperate by newline via serialport. Opens the door by powering a GPIO pin. Runs on a [Raspberry Pi Zero W](https://www.raspberrypi.com/products/raspberry-pi-zero-w/).

This turned from a random project in to a portfolio tier skill show off using as much new and fancy tech as possible. Aims the be very typesafe. The project currently has two parts.

The backend for which [Deno](https://deno.land/) was a considered runtime but my knowledge and trust in [Node](https://nodejs.org/) was considerably higher so it ended up being the winner. For I/O operations the libraries [`serialport`](https://serialport.io/) and [`onoff`](https://npmjs.com/package/onoff) are used. To be TypeSafe with the database operations I chose to use the [Prisma ORM](https://www.prisma.io/). I've been recently hearing a lot about [tRPC](https://trpc.io/) so I really wanted to use it for the API as it guarantees typesafety between the server and client. The tRPC API uses a websocket handler for subscriptions to be able to stream new logs to the frontend. For authentication the [JWT](https://www.npmjs.com/package/jsonwebtoken) is nothing fancy but just new for me.

The frontend which would have been a great show of my [React](https://reactjs.org/) skills but I ended up choosing between two new pieces of technology: [Svelte](https://svelte.dev/) and [SolidJS](https://www.solidjs.com/). Solid won as it feels more closer to React and I've heard some friends talk about it. To accompany Solid I needed [Solid Router](https://www.npmjs.com/package/@solidjs/router) and [Solid tRPC](https://www.npmjs.com/package/solid-trpc). To save myself from writing CSS but still have full control over styling, the frontend needed [Tailwind](https://tailwindcss.com/). With [Vite](https://vitejs.dev/) I'm able to move between iterations at the speed of light.

Both of which are contained in this monorepo which uses amazing tools such as [Yarn v3](https://yarnpkg.com/), [Turborepo](https://turbo.build/repo), [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/). As a DevOps enthusiastic I had to have CI/CD using [GitHub actions](https://docs.github.com/en/actions). And for deployment we have [Docker](https://www.docker.com/), so if it runs on my machine, it _will_ run on your machine.

**^ TODO: THESE MIGHT CHANGE, AT THE TIME OF WRITING THE FRONTEND AND MONOREPO DO NOT EVEN EXIST**

## Development

Use yarn and provided scripts

-   To install dependencies `yarn`
-   To format code `yarn format`
-   To lint code `yarn lint`
-   To build and run `yarn dev`

### Environmental variables

| Key                     | Value                             |
| ----------------------- | --------------------------------- |
| `NODE_ENV`              | `development`                     |
| `MOCK_CONTROL_PORT`     | Port for mock http control server |
| `MOCK_CONTROL_PASSWORD` | Password for mock control         |

These will enable debug logs and mock the I/O so you do not need the actual hardware.

### Database

Start PostgreSQL in Docker

```bash
docker run --rm -d --name postgres -p 5432:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=password -e POSTGRES_DB=some_db postgres
```

Generate the Prisma client and sync the database with `yarn prisma migrate dev`
For more, refer to the [Prisma docs](https://www.prisma.io/docs).

### Usage

#### Mock control

Send a `POST` request to `localhost:{MOCK_CONTROL_PORT}` with header `Authorization: {MOCK_CONTROl_PASSWORD}` and body being the string input you want to pipe to the serial handler.

## Production

**TODO, PROJECT STILL WORK-IN-PROGRESS**
