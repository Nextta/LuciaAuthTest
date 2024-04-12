# Creación del proyecto

```sh
npm create astro@latest -- --template basics
```

# Instalación de la librerías
```sh
npm install lucia oslo
```

```sh
npx astro add db
```
```sh
npx astro add node
```
```sh
npx astro add tailwind
```

## 🚀 Creación de las tablas de la DB

Nos dirijimos al archivo config de la base de datos en la carpeta `db/config.ts` y creamos las tablas que vamos a usar para este ejemplo.

```ts
import { defineDb, defineTable, column } from 'astro:db';

const User = defineTable({
  columns:{
    id: column.number({primaryKey: true}),
    username: column.text({unique: true, optional: false}),
    password: column.text({optional: true})
  }
})

const Session = defineTable({
  columns:{
    id: column.number({primaryKey: true}),
    userId: column.number({optional: false, references: () => User.columns.id}),
    expiresAt: column.number()
  }
})


// https://astro.build/db/config
export default defineDb({
  tables: {
    User,
    Session
  }
});
```

## Configuración Auth

Creamos un archivo llamado auth.ts dentro del directorio `src/auth.ts`, y una vez creado, antes de escribir el código, vamos a instalar el adaptador de drizzle para usarlo con Lucia.

```sh
npm install @lucia-auth/adapter-drizzle
```

```ts
import { Lucia } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { asDrizzleTable } from "@astrojs/db/runtime";
import { db, Session, User } from "astro:db";

const adapter = new DrizzleSQLiteAdapter(
    db as any,
	Session as any,
    User as any
); // your adapter

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: import.meta.env.PROD
		}
	}
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
	}
}
```

## Creación del middleware

Nos dirigimos al archivo de `src/env.d.ts` y pegamos el siguiente código.

```ts
declare namespace App {
	interface Locals {
		session: import("lucia").Session | null;
		user: import("lucia").User | null;
	}
}
```

Despues creamos un archivo llamado middleware.ts dentro de la carpera `src/middleware.ts` y pegamos el siguiente código.

```ts
import { lucia } from "./auth";
import { verifyRequestOrigin } from "lucia";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
	if (context.request.method !== "GET") {
		const originHeader = context.request.headers.get("Origin");
		const hostHeader = context.request.headers.get("Host");
		if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
			return new Response(null, {
				status: 403
			});
		}
	}

	const sessionId = context.cookies.get(lucia.sessionCookieName)?.value ?? null;
	if (!sessionId) {
		context.locals.user = null;
		context.locals.session = null;
		return next();
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		context.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		context.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
	}
	context.locals.session = session;
	context.locals.user = user;
	return next();
});
```

## Creación de la Api

Dentro de la carpeta src crearemos otra carpeta llamada api que quedaría de la siguiente forma: `src/api`. 

En esta carpeta tendremos los endpoint de la api.

Crearemos el primero llamandolo signup.ts, en la siguiente ruta `src/api/signup.ts` y pegamos el siguiente código.

```ts
import type { APIContext } from "astro";
import { generateId } from 'lucia';
import { Argon2id } from "oslo/password";
import { db, User } from "astro:db";
import { lucia } from "../auth";

export async function POST(context:APIContext): Promise<Response> {
    
    const formData = await context.request.formData();
    // Tiene que ser igual que los atributos de los campos name.
    const username = formData.get("username");
    const password = formData.get("password");

    // Validación de los datos.
    if(!username || !password){
        return new Response("Username y Password son requeridos.", {status:400});
    }

    if(typeof username !== 'string' || username.length < 3){
        return new Response("El username tiene que tener al menos 3 letras", {status:400});
    }

    if(typeof password !== 'string' || password.length < 6){
        return new Response("El password tiene que tener al menos 4 letras", {status:400});
    }

    // Insertar el usuario en la base de datos.
    const userId = generateId(15);
    const hashedPassword = await new Argon2id().hash(password);

    await db.insert(User).values([{
        id:userId,
        username: username,
        password: hashedPassword
    }]);

    // Generar session y la cookie.
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    context.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return context.redirect('/');
}
```


## Enlaces de referencia del tutorial seguido

![Video tutorial de Manu Martin: 20:50](https://www.youtube.com/watch?v=cAPzJ7sxPMk&t=474s)

![Tutorial de Lucia](https://lucia-auth.com/getting-started/astro)