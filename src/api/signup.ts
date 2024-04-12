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